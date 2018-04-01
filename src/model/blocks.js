'use strict'

const Cursor = require('node-lmdb').Cursor
const Debug = require('debug')
const logger = Debug('blocks')

module.exports = function (database) {
  const db = database.register({
    name: 'blocks',
    create: true,
    integerKey: true,
    keyIsUint32: true
  })

  class Blocks {
    static get (height) {
    }

    static getValid (callback) {
      if (typeof callback !== 'function') {
        return
      }
      const transaction = database.lmdb.beginTxn({readOnly: true})
      try {
        const cursor = new Cursor(transaction, db)
        for (let i = cursor.goToFirst(); i; i = cursor.goToNext()) {
          cursor.getCurrentString((key, json) => {
            const block = JSON.parse(json)
            if (block.locked) {
              callback(block)
            }
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

    static set (block) {
      const transaction = database.lmdb.beginTxn()
      try {
        transaction.putString(db, block.height, JSON.stringify(block))
        transaction.commit()
      } catch (err) {
        logger(`Failed to store block: ${err.stack}`)
        transaction.abort()
        throw err
      }
    }
  }

  return Blocks
}
