'use strict'

const LMDB = require('node-lmdb')
const Debug = require('debug')
const logger = Debug('lmdb')

class Database {
  constructor (databasePath = '/tmp', syncPeriod = 0) {
    this.databasePath = databasePath
    this.syncPeriod = syncPeriod
    this.syncInterval = null
  }

  start () {
    this.lmdb = new LMDB.Env()
    this.lmdb.open({
      path: this.databasePath,
      maxDbs: 10,
      mapSize: 24 * 1024 * 1024 * 1024,
      noSync: false,
      mapAsync: true,
      useWritemap: false,
      noMetaSync: true,
      maxReaders: 512
    })
    if (this.syncPeriod > 0) {
      this.syncInterval = setInterval(() => {
        this.lmdb.sync(err => err
          ? logger(`# Failed to synchronize lmdb to ${this.databasePath}: ${err}`)
          : logger(`# Synchronized lmdb to ${this.databasePath}`)
        )
      }, this.syncPeriod)
    }
  }
  register (config) {
    return this.lmdb.openDbi(config)
  }
}

module.exports = Database
