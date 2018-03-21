'use strict'

module.exports = function (database) {
  const blocks = database.register({
    name: 'blocks',
    create: true,
    integerKey: true,
    keyIsUint32: true
  })

  class Blocks {
    constructor (height) {
      this.height = height
    }

    static get (height) {
      return new Blocks(height)
    }

    set (data) {
      const transaction = database.lmdb.beginTxn()
      transaction.putString(blocks, this.height, JSON.stringify(data))
      transaction.commit()
      return this
    }
  }

  return Blocks
}
