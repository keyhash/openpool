'use strict'

const Network = require('net')
const Uuid = require('uuid/v4')
const EventEmitter = require('events')

const Debug = require('debug')
const logger = Debug('pool')
const statistics = Debug('statistics')

const Miner = require('./pool/miner')

const Connection = require('./network/connection')
const StratumConnection = require('./network/stratum-connection')

const MINER_PRUNE_INTERVAL = 120 * 1000
const MINER_MAX_INACTIVITY = 180 * 1000
const MINER_HASH_COUNT_UPDATE = 15 * 1000

module.exports = function ({ Blocks, MinerStatistics, Shares }) {
  class Pool extends EventEmitter {
    constructor (options, coin) {
      // @todo: validate configuration, reject in case of failure
      super()
      this.options = options
      this.coin = coin
      this.minerPool = new Map()

      this.miners = 0
    }

    start () {
      return new Promise((resolve, reject) => {
        this.coin.on('blockTemplate', blockTemplate => {
          this.minerPool.forEach(miner => {
            const { connection } = miner
            connection.reply({ method: 'job', params: miner.createJob(blockTemplate) })
          })
        })

        setInterval(() => {
          let inactiveMiners = 0
          this.minerPool.forEach((miner, id) => {
            if (Date.now() - miner.heartbeat > MINER_MAX_INACTIVITY) {
              this.minerPool.delete(id)
              inactiveMiners++
            }
          })
          if (inactiveMiners) {
            logger(`[!] Pruned ${inactiveMiners} inactive miners.`)
          }
        }, MINER_PRUNE_INTERVAL)

        setInterval(() => {
          this.minerPool.forEach(miner => miner.updateDifficulty())
        }, MINER_HASH_COUNT_UPDATE)

        const onStartup = (reason) => {
          if (reason) {
            reject(reason)
          }
          resolve(`Pool started @ ${this.options.address}:${this.options.port}`)
        }

        const onConnection = (socket) => {
          logger('=> A new socket connection arrived!')

          // @todo: check for banned IP addresses here
          socket.setKeepAlive(true)

          const rawConnection = new Connection(Uuid(), socket)
          const connection = new StratumConnection(rawConnection)

          // Message router: handles the messages sent from the miners.
          // There are four possible operations: auth, getjob, submit, keepalived
          // At this point `message` is parsed and correctly formed for the given operation.
          connection.on('message', (message) => {
            const { method, params: { id } } = message
            logger(`=> Miner: ${id || 'n/a'} Method: ${method}`)
            if (method === 'login') {
              this.emit(method, message, connection, this.coin)
            } else {
              const miner = this.minerPool.get(id)
              if (!miner) {
                connection.reply({ error: 'Unauthenticated' })
                return
              }
              miner.ping()
              this.emit(method, message, miner)
            }
          })
          connection.start() // start listening for messages
        }

        setInterval(() => {
          statistics(`# Miners: ${this.minerPool.size} Total Miners: ${this.miners}`)
        }, 10000)

        /**
         * Registers the miner in the miner list and provides a job for the miner
         */
        this.on('login', ({ id, params: { login, agent } }, connection, coin) => {
          if (connection.miner) {
            console.warn('A connection is being reused to authenticate a new miner')
            this.minerPool.delete(connection.miner.id)
          }
          try {
            const address = login
            const miner = new Miner(Uuid(), address, agent, coin, connection)
            connection.miner = miner
            this.minerPool.set(miner.id, miner)
            this.miners++
            miner.once('stop', (reason) => this.minerPool.delete(miner.id))
            miner.login(id)
          } catch (err) {
            connection.reply({ id, jsonrpc: '2.0', error: err })
          }
        })

        /**
         * This is used by the miners to avoid the connection to be cut
         * when there is not activity on the socket
         */
        this.on('keepalived', ({ id }, miner) => miner.keepalived(id))

        /**
         * Searches for a new job to assign to the miner
         */
        this.on('getjob', (message, miner) => miner.sendJob())

        /**
         * Handles new a miner submission
         */
        this.on('submit', ({ id, params: { job_id, nonce, result } }, miner) => { // eslint-disable-line camelcase
          miner.submit(job_id, Buffer.from(nonce, 'hex'), Buffer.from(result, 'hex'))
            .then(([share, block]) => {
              if (block) {
                Blocks.set(block) // Storing block
              }
              Shares.set(share)
              MinerStatistics.get(miner.address).valid()
              miner.reply({ id, jsonrpc: '2.0', result: { status: 'OK' } })
              miner.sendJob()
            })
            .catch(error => {
              // @todo ban-check
              MinerStatistics.get(miner.address).invalid()
              miner.reply({ id, jsonrpc: '2.0', error: error.message })
              miner.sendJob()
            })
        })

        Network.createServer(onConnection)
          .listen(this.options.port, this.options.address, onStartup)
      })
    }
  }

  return Pool
}
