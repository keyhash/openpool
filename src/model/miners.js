'use strict'

const CircularBuffer = require('circular-buffer')
const EventEmitter = require('events')
const Crypto = require('crypto')
const Debug = require('debug')
const logger = new Debug('miner')

module.exports = ({ Blocks, Jobs, Shares }, options) => {
  const { pools: {
    STARTING_HASH_COUNT,
    TARGET_JOB_DURATION,
    MINIMUM_SHARES_BEFORE_UNDESIRABLE_CHECK,
    UNDESIRABLE_LIMIT
  } } = options

  class Miners extends EventEmitter {
    constructor ({ id, address, difficulty, agent, coin, connection }) {
      super()
      this.id = id
      this.address = address
      this.agent = agent
      this.coin = coin
      this.connection = connection
      this.currentHashCount = difficulty ? Math.max(STARTING_HASH_COUNT, difficulty) : STARTING_HASH_COUNT

      this.currentHeight = 0
      this.heartbeat = Date.now()
      this.jobs = new CircularBuffer(4)

      this.connectionTimestamp = Date.now()
      this.totalHashCount = 0

      this.trust = {
        threshold: 30, // Number of shares before the miner can be trusted
        probability: 256,
        penalty: 0
      }

      this._valid = 0
      this._invalid = 0

      this.connection.once('stop', reason => {
        this.emit('stop', reason)
        this.connection = null
        this.removeAllListeners('stop')
        this.removeAllListeners('undesirable')
      })
    }

    isTrusted () {
      const random = Crypto.randomBytes(1).readUIntBE(0, 1) // integer between 0 and 255
      return this.trust.threshold <= 0 &&
        this.trust.penalty <= 0 &&
        this.trust.probability < random
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
     * @param {Number} accountId identifier of the account
     * @param {Number} jobId identifier of the miner request
     * @param {Buffer} nonce nonce discovered by the miner
     * @param {Buffer} result hash found by miner
     * @returns {Promise.<Share>} returns the share if it was successfully submitted
     */
    async submit (jobId, nonce, result) {
      try {
        const job = await this.findJob(jobId)
        await job.checkDuplicateSubmission(nonce)
        job.submissions.push(nonce)

        const blockTemplate = await this.coin.getBlockTemplateByHeight(job.height)
        const block = await blockTemplate.getBlock(nonce, job.extraNonce, result)

        if (!this.isTrusted()) {
          await block.checkHashMatches()
        }

        const share = Shares.build({
          height: job.height,
          address: this.address,
          coinCode: this.coin.code,
          hashCount: job.hashCount,
          trusted: this.isTrusted()
        })

        const difficulty = this.coin.getHashDifficulty(block.hash)

        logger(`[$] Submitted difficulty '${difficulty}' required difficulty: '${blockTemplate.difficulty}' job hashes: '${job.hashCount}'`)

        if (difficulty.ge(blockTemplate.difficulty)) {
          this.totalHashCount += job.hashCount
          try {
            await this.coin.submit(block)
            try {
              await Blocks.create(block.toJSON())
            } catch (err) {
              logger(`[!] Failed to save block ${this.address}: ${err.stack}`)
            }
            share.match = true
            logger(`[$] Block found !`)
          } catch (err) {
            logger(`[$] Block found but failed to submit ! ${err.stack}`)
          }
        } else if (difficulty.lt(job.hashCount)) {
          throw new Error('Low difficulty share')
        } else {
          this.totalHashCount += job.hashCount
        }

        this.trust.penalty--
        this.trust.probability = Math.max(20, this.trust.probability - 1)
        this.trust.threshold--

        return share
      } catch (err) {
        this.trust.penalty = 30
        this.trust.probability = 256
        this.trust.threshold = 30
        throw err
      }
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

    isDesirable () {
      if (this.valid + this.invalid >= MINIMUM_SHARES_BEFORE_UNDESIRABLE_CHECK) {
        return this.invalid / this.valid < UNDESIRABLE_LIMIT / 100
      }
      return true
    }

    get valid () {
      return this._valid
    }

    set valid (v) {
      if (this.valid + this.invalid >= MINIMUM_SHARES_BEFORE_UNDESIRABLE_CHECK) {
        this._valid = 0
        this._invalid = 0
      }
      this._valid = v
    }

    get invalid () {
      return this._invalid
    }

    set invalid (i) {
      this._invalid = i
      if (this.valid + this.invalid >= MINIMUM_SHARES_BEFORE_UNDESIRABLE_CHECK) {
        if (this.invalid / this.valid >= UNDESIRABLE_LIMIT / 100) {
          this.emit('undesirable')
        }
      }
    }

    remoteAddress () {
      if (this.connection) {
        return this.connection.remoteAddress
      }
    }

    stop (reason) {
      this.connection.stop(reason)
    }
  }

  Miners.build = (args) => {
    // @todo: validate arguments with Joi
    return new Miners(args)
  }

  return Miners
}
