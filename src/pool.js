'use strict'

const Network = require('net')
const Uuid = require('uuid/v4')
const EventEmitter = require('events')

const Debug = require('debug')
const logger = new Debug('pool')
const statistics = new Debug('statistics')

const Miner = require('./pool/miner')

const Connection = require('./network/connection')
const StratumConnection = require('./network/stratum-connection')

module.exports = function ({ Blocks, MinerStatistics, Shares }) {
  class Pool extends EventEmitter {
    constructor (options, coin) {
      // @todo: validate configuration, reject in case of failure
      super()
      this.options = options
      this.coin = coin
      this.miners = new Map()

      this.totalMiners = 0
    }

    start () {
      return new Promise((resolve, reject) => {
        this.coin.on('blockTemplate', blockTemplate => {
          this.miners.forEach(miner => {
            const { connection } = miner
            connection.reply({ method: 'job', params: miner.getJob(blockTemplate) })
          })
        })

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
              this.emit(method, message, connection)
            } else {
              const miner = this.miners.get(id)
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
          statistics(`# Miners: ${this.miners.size} Total Miners: ${this.totalMiners}`)
        }, 10000)

        /**
         * Registers the miner in the miner list and provides a job for the miner
         */
        this.on('login', ({ id, params: { login, agent } }, connection) => {
          if (connection.miner) {
            console.warn('A connection is being reused to authenticate a new miner')
            this.miners.delete(connection.miner.id)
          }
          try {
            const address = login
            const miner = new Miner(Uuid(), address, agent, this.coin, connection)
            connection.miner = miner
            this.miners.set(miner.id, miner)
            this.totalMiners++
            miner.once('stop', (reason) => {
              this.miners.delete(miner.id)
            })
            this.coin.getBlockTemplate()
              .then(blockTemplate =>
                miner.connection.reply({
                  id,
                  jsonrpc: '2.0',
                  result: {
                    id: miner.id,
                    job: miner.getJob(blockTemplate),
                    status: 'OK'
                  }
                })
              )
          } catch (err) {
            connection.reply({ id, jsonrpc: '2.0', error: err })
          }
        })

        /**
         * This is used by the miners to avoid the connection to be cut
         * when there is not activity on the socket
         */
        this.on('keepalived', ({ id }, miner) => {
          miner.connection.reply({ id, jsonrpc: '2.0', result: { status: 'KEEPALIVED' } })
        })

        /**
         * Searches for a new job to assign to the miner
         */
        this.on('getjob', (message, miner) => {
          this.coin.getBlockTemplate()
            .then(blockTemplate =>
              miner.connection.reply({ jsonrpc: '2.0', method: 'job', params: miner.getJob(blockTemplate) })
            )
        })

        /**
         * Handles new a miner submission
         */
        this.on('submit', ({ id, params: { job_id, nonce, result } }, miner) => { // eslint-disable-line camelcase
          const job = miner.findJob(job_id)
          // Validate that job still exists
          if (!job) {
            // @todo: ban-check
            miner.connection.reply({ id, jsonrpc: '2.0', error: 'Invalid job id' })
            return
          }

          // Validate nonce was not previously submitted by the miner
          if (job.submissions.includes(nonce)) {
            // @todo: ban-check
            MinerStatistics.get(miner.address).incrementInvalid()
            miner.connection.reply({ id, jsonrpc: '2.0', error: 'Duplicate share' })
            return
          }
          job.submissions.push(nonce)
          // Find block template
          const blockTemplate = this.coin.getBlockTemplates().find(blockTemplate => blockTemplate.height === job.height)
          if (!blockTemplate) {
            // @todo: calculate new difficulty
            logger(`<= Miner ${miner.id} submitted an expired block ${job.height}`)
            MinerStatistics.get(miner.address).incrementInvalid()
            miner.connection.reply({ id, jsonrpc: '2.0', error: 'Block expired' })
            // Send the miner a new task
            this.coin.getBlockTemplate()
              .then(blockTemplate =>
                miner.connection.reply({ jsonrpc: '2.0', method: 'job', params: miner.getJob(blockTemplate) })
              )
            return
          }

          // Process share
          const block = blockTemplate.getBlockBlob(Buffer.from(nonce, 'hex'), job.extraNonce)
          const cheat = false // @todo: fake it until you can make it
          if (cheat /* block.hash.toString('hex') !== result */) {
            miner.connection.reply({ id, jsonrpc: '2.0', error: 'Invalid share' })
            // @todo new-diff
            this.coin.getBlockTemplate()
              .then(blockTemplate =>
                miner.connection.reply({ jsonrpc: '2.0', method: 'job', params: miner.getJob(blockTemplate) })
              )
            return
          }

          const share = {
            hashCount: job.hashCount,
            minderId: miner.id,
            address: miner.address,
            difficulty: blockTemplate.difficulty,
            height: job.height,
            timestamp: Date.now()
          }

          const difficulty = this.coin.getHashDifficulty(Buffer.from(result, 'hex') /* block.hash */)
          logger(`! Submitted difficulty ${difficulty} blockTemplate.difficulty: ${blockTemplate.difficulty} job.hashCount: ${job.hashCount}`)
          if (difficulty.ge(blockTemplate.difficulty)) {
            this.coin.submit(block.blob)
              .then(response => {
                logger(`@ Block found !`)
                MinerStatistics.get(miner.address).incrementInvalid().incrementTotalHashes(job.hashCount)
                Shares.get(job.height).set(Object.assign(share, { blockFound: true }))
                Blocks.get(job.height).set({
                  hash: block.id,
                  difficulty: blockTemplate.difficulty,
                  timestamp: Date.now(),
                  unlocked: false,
                  valid: true
                })
              })
              .catch(err => {
                logger(`@ Block found but failed to submit ! ${err}`)
                MinerStatistics.get(miner.address).incrementInvalid().incrementTotalHashes(job.hashCount)
                Shares.get(job.height).set(Object.assign(share, { blockFound: false }))
              })
          } else if (difficulty.lt(job.hashCount)) {
            // @todo: ban-check
            miner.connection.reply({ id, jsonrpc: '2.0', error: 'Low difficulty share' })
          } else {
            Shares.get(job.height).set(Object.assign(share, { blockFound: false }))
          }

          // @todo: new-diff

          // Handle submission
          miner.connection.reply({ id, jsonrpc: '2.0', result: { status: 'OK' } })
        })

        Network.createServer(onConnection)
          .listen(this.options.port, this.options.address, onStartup)
      })
    }
  }

  return Pool
}
