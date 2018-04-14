'use strict'

const EventEmitter = require('events')
const Debug = require('debug')
const Uuid = require('uuid/v4')

const logger = Debug('pool')
const statisticsLogger = Debug('statistics')

const STATISTIC_LOG_INTERVAL = 10 * 1000
const MINER_PRUNE_INTERVAL = 120 * 1000
const MINER_MAX_INACTIVITY = 180 * 1000
const MINER_HASH_COUNT_UPDATE = 15 * 1000

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    server.dependency('model', async () => {
      const { Accounts, Miners } = server.plugins.model
      const stratum = await server.methods.stratum(options.pool) // @todo on pre-start
      const coin = server.plugins.coins.monero
      const emitter = new EventEmitter()
      const minerPool = new Map()
      let miners = 0 // all time number of miner connected to the pool

      coin.on('blockTemplate', blockTemplate => {
        minerPool.forEach(miner => {
          const { connection } = miner
          connection.reply({ method: 'job', params: miner.createJob(blockTemplate) })
        })
      })

      const onConnection = (connection) => {
        // Message router: handles the messages sent from the miners.
        // There are four possible operations: auth, getjob, submit, keepalived
        // At this point `message` is parsed and correctly formed for the given operation.
        connection.on('message', (message) => {
          const { method, params: { id } } = message
          logger(`=> Miner: ${id || 'n/a'} Method: ${method}`)
          if (method === 'login') {
            emitter.emit(method, message, connection, coin)
          } else {
            const miner = minerPool.get(id)
            if (!miner) {
              connection.reply({ error: 'Unauthenticated' })
              return
            }
            miner.ping()
            emitter.emit(method, message, miner)
          }
        })
      }

      /**
       * Registers the miner in the miner list and provides a job for the miner
       */
      emitter.on('login', ({ id, params: { login, agent } }, connection, coin) => {
        if (connection.miner) {
          console.warn('A connection is being reused to authenticate a new miner')
          minerPool.delete(connection.miner.id)
        }
        try {
          const address = login
          const miner = Miners.build({ id: Uuid(), address, agent, coin, connection })
          connection.miner = miner
          minerPool.set(miner.id, miner)
          miners++
          miner.once('stop', (reason) => minerPool.delete(miner.id))
          miner.login(id)
        } catch (err) {
          connection.reply({ id, jsonrpc: '2.0', error: err })
        }
      })

      /**
       * This is used by the miners to avoid the connection to be cut
       * when there is not activity on the socket
       */
      emitter.on('keepalived', ({ id }, miner) => miner.keepalived(id))

      /**
       * Searches for a new job to assign to the miner
       */
      emitter.on('getjob', (message, miner) => miner.sendJob())

      /**
       * Handles new a miner submission
       */
      emitter.on('submit', ({ id, params: { job_id, nonce, result } }, miner) => { // eslint-disable-line camelcase
        miner.submit(job_id, Buffer.from(nonce, 'hex'), Buffer.from(result, 'hex'))
          .then(async ([share]) => {
            Accounts.findOrCreate({ where: { address: miner.address }, defaults: { coinCode: coin.code } })
              .spread((account, created) => {
                account.hashes += share.hashCount
                account.valid++
                account.save()
              })
            miner.reply({ id, jsonrpc: '2.0', result: { status: 'OK' } })
            miner.sendJob()
          })
          .catch(async error => {
            // @todo ban-check
            Accounts.findOrCreate({ where: { address: miner.address }, defaults: { coinCode: coin.code } })
              .spread((account, created) => {
                account.valid++
                account.save()
              })
            miner.reply({ id, jsonrpc: '2.0', error: error.message })
            miner.sendJob()
          })
      })

      stratum.on('connection', onConnection)

      setInterval(() => {
        statisticsLogger(`# Miners: ${minerPool.size} Total Miners: ${miners}`)
      }, STATISTIC_LOG_INTERVAL)

      setInterval(() => {
        let numberOfInactiveMiners = 0
        minerPool.forEach((miner, id) => {
          if (Date.now() - miner.heartbeat > MINER_MAX_INACTIVITY) {
            minerPool.delete(id)
            numberOfInactiveMiners++
          }
        })
        if (numberOfInactiveMiners) {
          logger(`[!] Pruned ${numberOfInactiveMiners} inactive miners.`)
        }
      }, MINER_PRUNE_INTERVAL)

      setInterval(() => {
        minerPool.forEach(miner => miner.updateDifficulty())
      }, MINER_HASH_COUNT_UPDATE)
    })
  }
}
