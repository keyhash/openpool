'use strict'

class Share {
  constructor (height, address, hashCount, match = false) {
    this.height = height
    this.address = address
    this.hashCount = hashCount
    this.match = false
  }
}

module.exports = Share
