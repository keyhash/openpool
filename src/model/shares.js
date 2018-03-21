'use strict'

module.exports = function (database) {
  const shares = database.register({
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

    static get (height) {
      return new Shares(height)
    }

    set (data) {
      const transaction = database.lmdb.beginTxn()
      transaction.putBinary(shares, this.height, Buffer.from(JSON.stringify(data)))
      transaction.commit()
      return this
    }
  }

  return Shares
}
