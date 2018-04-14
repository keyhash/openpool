'use strict'

const STARTING_HASH_COUNT = 1000 // hashes
const TARGET_JOB_DURATION = 30 // seconds

const CircularBuffer = require('circular-buffer')
const EventEmitter = require('events')
const Debug = require('debug')
const logger = new Debug('miner')

module.exports = ({ Blocks, Jobs, Shares }) => {
  class Miners extends EventEmitter {
    constructor ({ id, address, agent, coin, connection }) {
      super()
      this.id = id
      this.address = address
      this.agent = agent
      this.coin = coin
      this.connection = connection
      this.currentHashCount = STARTING_HASH_COUNT

      this.currentHeight = 0
      this.heartbeat = Date.now()
      this.jobs = new CircularBuffer(4)

      this.connectionTimestamp = Date.now()
      this.totalHashCount = 0

      this.connection.once('stop', reason => {
        this.emit('stop', reason)
        this.connection = null
      })
    }

    login (id) {
      this.coin.getBlockTemplate()
        .then(blockTemplate =>
          this.reply({ id, jsonrpc: '2.0', result: { id: this.id, job: this.createJob(blockTemplate), status: 'OK' } })
        )
    }

    /**
     * Sends the miner a keepalive message
     *
     * @param {Number} id identifier of the transaction
     */
    keepalived (id) {
      this.reply({ id, jsonrpc: '2.0', result: { status: 'KEEPALIVED' } })
    }

    /**
     * Handles the submission of a job by a miner
     *
     * @param {Number} id identifier of the miner request
     * @param {Buffer} nonce nonce discovered by the miner
     * @param {Buffer} result hash found by miner
     * @returns {Promise.<Block>} returns the block if it was successfully submitted
     */
    submit (id, nonce, result) {
      const trusted = true
      return this.findJob(id)
        .then(job => job.checkDuplicateSubmission(nonce))
        .then(job => {
          job.submissions.push(nonce)
          return this.coin.getBlockTemplateByHeight(job.height)
            .then(blockTemplate => Promise.all([
              blockTemplate.getBlock(nonce, job.extraNonce, result /* only when trusted */),
              blockTemplate
            ]))
            .then(([block, blockTemplate]) => Promise.all([
              trusted ? block : block.checkHashMatches(result),
              blockTemplate
            ]))
            .then(([block, blockTemplate]) => {
              const difficulty = this.coin.getHashDifficulty(result /* block.hash */)
              const share = Shares.build({
                height: job.height,
                address: this.address,
                hashCount: job.hashCount
              })
              logger(`[$] Submitted difficulty ${difficulty} required difficulty: ${blockTemplate.difficulty} job hashes: ${job.hashCount}`)
              if (difficulty.ge(blockTemplate.difficulty)) {
                this.totalHashCount += job.hashCount
                return this.coin.submit(block)
                  .then(() => {
                    console.log(block.toJSON())
                    Blocks.build(block.toJSON()).save()
                    share.match = true
                    share.save()
                    logger(`[$] Block found !`)
                  })
                  .then(() => ([share]))
                  .catch(err => {
                    logger(`[$] Block found but failed to submit ! ${err.stack}`)
                    share.save()
                    return [share]
                  })
              } else if (difficulty.lt(job.hashCount)) {
                return Promise.reject(new Error('Low difficulty share'))
              } else {
                share.save()
                this.totalHashCount += job.hashCount
              }
              return [share]
            })
        })
    }

    sendJob () {
      this.coin.getBlockTemplate()
        .then(blockTemplate =>
          this.reply({ jsonrpc: '2.0', method: 'job', params: this.createJob(blockTemplate) })
        )
    }

    reply (message) {
      if (this.connection) {
        this.connection.reply(message)
      }
    }

    ping () {
      this.heartbeat = Date.now()
    }

    /**
     * Looks up the given job in the list of the jobs of the miner.
     *
     * @param {String} id the job id
     * @returns {Promise.<Job>} the job
     */
    findJob (id) {
      return new Promise((resolve, reject) => {
        const job = this.jobs.toarray().find(job => job.id === id)
        if (job) {
          resolve(job)
        } else {
          reject(new Error('Invalid job id'))
        }
      })
    }

    createJob (blockTemplate) {
      if (this.currentHeight === blockTemplate.height && this.jobs.get(0)) {
        return this.jobs.get(0).response
      }
      const target = this.coin.getTargetDifficulty(this.currentHashCount).toString('hex')
      const job = Jobs.build({
        minerId: this.id,
        extraNonce: this.coin.nonce,
        hashCount: this.currentHashCount,
        blockTemplate,
        target
      })
      this.jobs.enq(job)
      return job.task
    }

    updateDifficulty () {
      if (this.totalHashCount > 0) {
        this.currentHashCount = Math.floor(this.totalHashCount / (Math.floor((Date.now() - this.connectionTimestamp) / 1000)) * TARGET_JOB_DURATION)
      }
    }
  }

  Miners.build = (args) => {
    // @todo: validate arguments with Joi
    return new Miners(args)
  }

  return Miners
}
