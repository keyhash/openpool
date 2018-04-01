'use strict'

const Debug = require('debug')
const logger = Debug('miner-statistics')

module.exports = function (database) {
  const db = database.register({
    name: 'miner-statistics',
    create: true
  })

  function incr (key, increment) {
    const transaction = database.lmdb.beginTxn()
    try {
      let value = transaction.getNumber(db, key)
      if (typeof value === 'number') {
        value += increment
      } else {
        value = 1
      }
      transaction.putNumber(db, key, value)
      transaction.commit()
    } catch (err) {
      logger(`Failed to store miner-statistics: ${err.stack}`)
      transaction.abort()
      throw err
    }
  }

  class MinerStatistics {
    constructor (address) {
      this.address = address
    }

    static get (address) {
      return new MinerStatistics(address)
    }

    invalid (increment = 1) {
      incr(`invalid-shares@${this.address}`, increment)
      return this
    }

    valid (increment = 1) {
      incr(`good-shares@${this.address}`, increment)
      return this
    }

    incrementTotalHashes (increment = 1) {
      incr(`total-hashes@${this.address}`, increment)
      return this
    }
  }
  return MinerStatistics
}
