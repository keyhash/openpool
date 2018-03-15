'use strict'

const BASE_DIFFICULTY = 1000

const Crypto = require('crypto')
const CircularBuffer = require('circular-buffer')

class Miner {
  constructor (id, address, agent, coin, connection) {
    this.id = id
    this.address = address
    this.agent = agent
    this.coin = coin
    this.connection = connection
    this.difficulty = BASE_DIFFICULTY

    this.lastBlockHeight = 0
    this.lastHeartBeat = Date.now()
    this.jobs = new CircularBuffer(4)
  }

  heartbeat () {
    this.lastHeartBeat = Date.now()
  }

  findJob (id) {
    return this.jobs.toarray().find(job => job.id === id)
  }

  getJob (activeBlockTemplate) {
    if (this.lastBlockHeight === activeBlockTemplate.height && this.jobs.get(0)) {
      return this.jobs.get(0).sentToMiner
    }
    activeBlockTemplate.incrementNonce()
    const id = Crypto.pseudoRandomBytes(21).toString('base64')
    const job = {
      id,
      extraNonce: activeBlockTemplate.extraNonce,
      height: activeBlockTemplate.height,
      difficulty: this.difficulty,
      submissions: [],
      sentToMiner: {
        blob: activeBlockTemplate.blob(),
        job_id: id,
        target: this.coin.getTargetDifficulty(this.difficulty).toString('hex'),
        id: this.id
      }
    }
    this.jobs.enq(job)
    return job.sentToMiner
  }
}

module.exports = Miner
