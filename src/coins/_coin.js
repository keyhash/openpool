'use strict'

/* Interface */

class Coin {
  validateAddress () {
    throw new Error('Not implemented')
  }
  getBaseDifficulty () {
    throw new Error('Not implemented')
  }
  getBlockTemplate () { // Promise
    throw new Error('Not implemented')
  }
}

module.exports = Coin
