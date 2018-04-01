'use strict'

const Cursor = require('node-lmdb').Cursor
const Debug = require('debug')
const logger = new Debug('shares')

module.exports = function (database) {
  const db = database.register({
    name: 'shares',
    create: true,
    dupSort: true,
    dupFixed: false,
    integerDup: true,
    integerKey: true,
    keyIsUint32: true
  })

  class Shares {
    constructor (height) {
      this.height = height
    }

    static get (height, callback) {
      const transaction = database.lmdb.beginTxn({readOnly: true})
      try {
        const cursor = new Cursor(transaction, db)
        for (let i = cursor.goToRange(height) === height; i; i = cursor.goToNextDup()) {
          cursor.getCurrentBinary(function (key, json) {
            const share = JSON.parse(json)
            callback(share)
          })
        }
        cursor.close()
        transaction.commit()
      } catch (err) {
        logger(`Failed to get valid blocks: ${err.stack}`)
        transaction.abort()
        throw err
      }
    }

    static set (share) {
      const transaction = database.lmdb.beginTxn()
      try {
        transaction.putBinary(db, share.height, Buffer.from(JSON.stringify(share)))
        transaction.commit()
      } catch (err) {
        logger(`Failed to store share: ${err.stack}`)
        transaction.abort()
        throw err
      }
    }
  }

  return Shares
}
