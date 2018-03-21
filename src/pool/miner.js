'use strict'

const BASE_HASH_COUNT = 1000

const Crypto = require('crypto')
const CircularBuffer = require('circular-buffer')
const EventEmitter = require('events')

class Miner extends EventEmitter {
  constructor (id, address, agent, coin, connection) {
    super()
    this.id = id
    this.address = address
    this.agent = agent
    this.coin = coin
    this.connection = connection
    this.hashCount = BASE_HASH_COUNT

    this.lastBlockHeight = 0
    this.lastHeartBeat = Date.now()
    this.jobs = new CircularBuffer(4)

    this.connection.once('stop', reason => {
      this.emit('stop', reason)
      this.connection = null
    })
  }

  heartbeat () {
    this.lastHeartBeat = Date.now()
  }

  findJob (id) {
    return this.jobs.toarray().find(job => job.id === id)
  }

  getJob (blockTemplate) {
    if (this.lastBlockHeight === blockTemplate.height && this.jobs.get(0)) {
      return this.jobs.get(0).response
    }
    const extraNonce = blockTemplate.setNextExtraNonce()
    const id = Crypto.pseudoRandomBytes(21).toString('base64')
    const job = {
      id,
      hashCount: this.hashCount,
      height: blockTemplate.height,
      extraNonce,
      submissions: [],
      response: {
        blob: blockTemplate.getBlockHashingBlock(),
        job_id: id,
        target: this.coin.getTargetDifficulty(this.hashCount).toString('hex'),
        id: this.id
      }
    }
    this.jobs.enq(job)
    return job.response
  }
}

module.exports = Miner
