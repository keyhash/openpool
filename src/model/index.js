'use strict'

module.exports = function (database) {
  return {
    Blocks: require('./blocks')(database),
    MinerStatistics: require('./miner-statistics')(database),
    Shares: require('./shares')(database)
  }
}
