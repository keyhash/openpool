'use strict'

const BigNum = require('bignum')
const Crypto = require('crypto')
const CryptoNoteUtil = require('cryptonote-util')
const CryptoNight = require('node-cryptonight').hash

const Coin = require('./_coin')

const INSTANCE_ID = Crypto.randomBytes(4)

class Monero extends Coin {
  constructor (address, RPCMonero) {
    super()
    this.address = address // pool address
    this.RPCMonero = RPCMonero
  }

  getBlockBlobHash (blockBlob) {
    const convertedBlob = CryptoNoteUtil.convert_blob(blockBlob)
    return CryptoNight(convertedBlob)
  }

  /**
   * The 'getbklocktemplate' RPC returns a 'blockhashing_blob' and a 'blocktemplate_blob'.
   *
   * You can either try to find a nonce (4 bytes) by mining using the blockhashing_blob,
   * or you can try to find two nonces (4 bytes in the block header, reserved_size bytes
   * in the extra field of the mining reward transaction) using the blocktemplate_blob
   * and computing the transaction Merkle tree yourself.
   *
   * This function builds the block with the 'nonce' and the 'extraNonce'
   *
   * @param {BlockTemplate} blockTemplate
   * @param {Buffer} nonce
   * @param {number} extraNonce
   */
  getBlockBlob (blockTemplate, bNonce, extraNonce) {
    const blockTemplateClone = blockTemplate.clone()
    blockTemplateClone.setExtraNonce(extraNonce)
    return CryptoNoteUtil.construct_block_blob(blockTemplateClone.blockTemplateBlob, bNonce)
  }

  /**
   * The identifier of a block is the result of hashing the following data with Keccak:
   *  * Size of [Block_header, Merkle root hash, and the number of transactions] in bytes
   *  * Block_header
   *  * Merkle root hash
   *  * Number of transactions
   * The goal of the Merkle root hash is to "attach" the transactions referred to in the list to the block header:
   * once the Merkle root hash is fixed, the transactions cannot be modified.
   *
   * @param {Buffer} bBlock
   */
  getBlockId (bBlock) {
    return CryptoNoteUtil.get_block_id(bBlock)
  }

  /**
   * @return {BigNum} the base difficulty
   */
  getBaseDifficulty () {
    return new BigNum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16)
  }

  getBlockTemplate () { // eslint-disable-line camelcase
    return this.RPCMonero
      .request('getblocktemplate', { reserve_size: 17, wallet_address: this.address })
      .then(response => {
        if (response.error) {
          throw new Error(response.error.message)
        }
        return response.result
      })
      .then(blockTemplate => new BlockTemplate(blockTemplate))
  }

  submit (block) {
    return this.RPCMonero
      .request('submitblock', [block.toString('hex')])
      .then(response => {
        if (response.error) {
          throw new Error(response.error.message)
        }
        return response.result
      })
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
}

let extraNonce = 0
class BlockTemplate {
  constructor (blockTemplate) {
    this.blockTemplate = blockTemplate

    this.height = blockTemplate.height
    this.difficulty = blockTemplate.difficulty
    this.reservedOffset = blockTemplate.reserved_offset
    this.previousHash = blockTemplate.previous_hash // this.blockTemplateBlob.copy(this.previousHash, 0, 7, 39)
    this.blockTemplateBlob = Buffer.from(this.blockTemplate.blocktemplate_blob, 'hex')
    this.blockHashingBlob = Buffer.from(this.blockTemplate.blockhashing_blob, 'hex')

    // Copy the INSTANCE_ID to the reserve offset + 4 bytes deeper. Copy in 4 bytes.
    INSTANCE_ID.copy(this.blockTemplateBlob, this.reservedOffset + 4, 0, 3)
  }

  setNextExtraNonce () {
    this.setExtraNonce(++extraNonce)
    return extraNonce
  }

  setExtraNonce (extraNonce) {
    this.blockTemplateBlob.writeUInt32BE(extraNonce, this.reservedOffset)
  }

  getBlockHashingBlock () {
    // Or use - this.blockTemplate.blockhashing_blob - but then disable extra nonce & INSTANCE_ID
    return CryptoNoteUtil.convert_blob(this.blockTemplateBlob).toString('hex')
  }

  clone () {
    return new BlockTemplate(this.blockTemplate)
  }
}

module.exports = Monero
