'use strict'

const BigNum = require('bignum')
const Coin = require('./_coin')
const Crypto = require('crypto')
const CryptoNoteUtil = require('cryptonote-util')

const INSTANCE_ID = Crypto.randomBytes(4)

class Monero extends Coin {
  constructor (daemonRpc) {
    super()
    this.daemonRpc = daemonRpc
  }
  getBlockTemplate (wallet_address) { // eslint-disable-line camelcase
    return this.daemonRpc
      .request('getblocktemplate', { reserve_size: 17, wallet_address })
      .then(response => {
        if (response.error) {
          throw new Error(response.error.message)
        }
        return response.result
      })
      .then(blockTemplate => new BlockTemplate(blockTemplate))
  }
  getBaseDifficulty () {
    return new BigNum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16)
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
}

class BlockTemplate {
  constructor (blockTemplate) {
    this.blockTemplate = blockTemplate

    this.height = blockTemplate.height
    this.difficulty = blockTemplate.difficulty
    this.reservedOffset = blockTemplate.reserved_offset

    this.blockTemplateBlob = Buffer.from(this.blockTemplate.blocktemplate_blob, 'hex')
    this.previousHash = Buffer.alloc(32)
    // Extract the block hash to a new buffer
    this.blockTemplateBlob.copy(this.previousHash, 0, 7, 39)
    // Copy the INSTANCE_ID to the reserve offset + 4 bytes deeper. Copy in 4 bytes.
    INSTANCE_ID.copy(this.blockTemplateBlob, this.reservedOffset + 4, 0, 4)
    // Reset the nonce. This is the per-miner/pool nonce
    this.extraNonce = 0
  }

  incrementNonce () {
    this.blockTemplateBlob.writeUInt32BE(++this.extraNonce, this.reservedOffset)
  }

  blob () {
    return CryptoNoteUtil.convert_blob(this.blockTemplateBlob).toString('hex')
  }

  nextBlobWithChildOnce () { // unused
    this.incrementNonce() // move this to your function
    return this.blockTemplateBlob.toString('hex')
  }
}

module.exports = Monero
