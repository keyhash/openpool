'use strict'

module.exports = function (database) {
  const minerStatistics = database.register({
    name: 'miner-statistics',
    create: true
  })

  function incr (key, increment) {
    const transaction = database.lmdb.beginTxn()
    let shares = transaction.getNumber(minerStatistics, key)
    if (typeof shares === 'number') {
      shares += increment
    } else {
      shares = 1
    }
    transaction.putNumber(minerStatistics, key, shares)
    transaction.commit()
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
