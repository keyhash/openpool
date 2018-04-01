'use strict'

const BigNum = require('bignum')
const EventEmitter = require('events')
const CircularBuffer = require('circular-buffer')
const Debug = require('debug')
const logger = Debug('coin')

const TEMPLATE_INTERVAL = 2000

class AbstractCoin extends EventEmitter {
  constructor (blockTemplateRefreshInterval = TEMPLATE_INTERVAL) {
    super()
    this.blockHeader = null
    this.blockTemplate = null
    this.blockTemplates = new CircularBuffer(4)
    this.blockTemplateRefreshInterval = blockTemplateRefreshInterval
    this._nonce = 0 // this is the extra nonce
  }

  /**
   * This is the extra nonce.
   * @returns {Number} the extra nonce
   */
  get nonce () {
    if (Number.MAX_SAFE_INTEGER === this._nonce) {
      this._nonce = 0
    }
    return this._nonce++
  }

  /**
   * @return {BigNum} the base difficulty
   */
  getBaseDifficulty () {
    throw new Error('Subclass failed to implement method.')
  }

  start () {
    setInterval(() => {
      this._getBlockTemplate()
        .then(blockTemplate => {
          if (!this.blockTemplate || (blockTemplate.height !== this.blockTemplate.height)) {
            logger('[$] Fetched new block template')
            this.blockTemplates.enq(blockTemplate)
            this.blockTemplate = blockTemplate
            if (this.deferBlockTemplate) {
              this.deferBlockTemplate(blockTemplate)
              this.deferBlockTemplate = null
            }
            this.emit('blockTemplate', this.blockTemplate)
          }
        })
        .catch((err) => {
          logger(`[!] Failed to obtain the last block template: ${err.stack}`)
        })
      this._getLastBlockHeader()
        .then(blockHeader => {
          if (!this.blockHeader || (blockHeader.height !== this.blockHeader.height)) {
            logger('[$] Fetched new block header')
            this.blockHeader = blockHeader
            if (this.deferBlockHeader) {
              this.deferBlockHeader(blockHeader)
              this.deferBlockHeader = null
            }
            this.emit('blockHeader', this.blockHeader)
          }
        })
    }, this.blockTemplateRefreshInterval)
  }

  /**
   * Fetches the most recent block template form the coin daemon
   *
   * @returns {Promise.<BlockTemplate>} block template
   */
  _getBlockTemplate () { // Promise
    throw new Error('Subclass failed to implement method.')
  }

  /**
   * Fetches the most recent block template form the coin daemon
   *
   * @returns {Promise.<BlockHeader>} block template
   */
  _getLastBlockHeader () {
    throw new Error('Subclass failed to implement method.')
  }

  getBlockTemplate () {
    return this.blockTemplate
      ? Promise.resolve(this.blockTemplate)
      : new Promise((resolve, reject) => { this.deferBlockTemplate = resolve })
  }

  getBlockTemplateByHeight (height) {
    return new Promise((resolve, reject) => {
      const blockTemplate = this.blockTemplates.toarray().find(blockTemplate => blockTemplate.height === height)
      if (blockTemplate) {
        resolve(blockTemplate)
      } else {
        reject(new Error('Block expired'))
      }
    })
  }

  getBlockHeaderByHeight () {
    throw new Error('Subclass failed to implement method.')
  }

  getBlockHeaderByHash () {
    throw new Error('Subclass failed to implement method.')
  }

  getLastBlockHeader () {
    return this.blockHeader
      ? Promise.resolve(this.blockHeader)
      : new Promise((resolve, reject) => { this.deferBlockHeader = resolve })
  }

  getHashDifficulty (bHash) {
    // Reverse buffer inplace
    for (var i = 0, j = bHash.length - 1; i < j; ++i, --j) {
      var t = bHash[j]
      bHash[j] = bHash[i]
      bHash[i] = t
    }
    return this.getBaseDifficulty().div(BigNum.fromBuffer(bHash))
  }

  getTargetDifficulty (_difficulty) {
    const buffer = Buffer.alloc(32)
    const difficulty = this.getBaseDifficulty().div(_difficulty).toBuffer()
    // Copy the difficulty towards the end of the buffer
    difficulty.copy(buffer, 32 - difficulty.length)
    // Extract first 4 bytes
    const header = buffer.slice(0, 4)
    // Reverse buffer inplace
    for (var i = 0, j = header.length - 1; i < j; ++i, --j) {
      var t = header[j]
      header[j] = header[i]
      header[i] = t
    }
    return header
  }

  submit (block) {
    throw new Error('Subclass failed to implement method.')
  }

  validateAddress () {
    throw new Error('Subclass failed to implement method.')
  }
}

module.exports = AbstractCoin
