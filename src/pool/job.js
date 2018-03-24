'use strict'

const Crypto = require('crypto')

class Job {
  constructor (minerId, blockTemplate, extraNonce, hashCount, target) {
    this.minerId = minerId
    this.id = Crypto.pseudoRandomBytes(21).toString('base64')
    this.height = blockTemplate.height
    this.hashCount = hashCount
    this.extraNonce = extraNonce
    this.submissions = []
    this.blockHashingBlob = blockTemplate.getBlockHashingBlob(extraNonce).toString('hex')
    this.target = target
  }

  /**
   * Checks if the nonce is already in the list of submissions
   *
   * @param {Buffer} nonce
   * @returns {Promise.<Job>} the job
   */
  checkDuplicateSubmission (nonce) {
    return new Promise((resolve, reject) => {
      for (let n of this.submissions) {
        if (n.equals(nonce)) {
          return reject(new Error('Duplicate share'))
        }
      }
      resolve(this)
    })
  }

  get task () {
    return {
      id: this.minerId,
      job_id: this.id,
      blob: this.blockHashingBlob,
      target: this.target
    }
  }
}

module.exports = Job
