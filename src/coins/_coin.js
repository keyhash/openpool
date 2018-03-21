'use strict'

const EventEmitter = require('events')
const CircularBuffer = require('circular-buffer')
const Debug = require('debug')
const logger = Debug('coin')

const TEMPLATE_INTERVAL = 2000

class Coin extends EventEmitter {
  constructor (blockTemplateRefreshInterval = TEMPLATE_INTERVAL) {
    super()
    this.blockTemplate = null
    this.blockTemplates = new CircularBuffer(4)
    this.blockTemplateRefreshInterval = blockTemplateRefreshInterval
  }

  start () {
    setInterval(() => {
      this.getBlockTemplate()
        .then(blockTemplate => {
          logger('# Fetched new block template')
          if (!this.blockTemplate || (blockTemplate.height !== this.blockTemplate.height)) {
            this.blockTemplates.enq(blockTemplate)
            this.blockTemplate = blockTemplate
            if (this.defer) {
              this.defer(blockTemplate)
              this.defer = null
            }
            this.emit('blockTemplate', this.blockTemplate)
          }
        })
        .catch((err) => {
          logger(`! Failed to obtain the last bloc template: ${err}`)
        })
    }, this.blockTemplateRefreshInterval)
  }

  constructBlockBlob () {
    throw new Error('Not implemented')
  }

  getActiveBlockTemplate () {
    return this.blockTemplate
      ? Promise.resolve(this.blockTemplate)
      : new Promise((resolve, reject) => { this.defer = resolve })
  }

  getBaseDifficulty () {
    throw new Error('Not implemented')
  }

  getBlockTemplates () {
    return this.blockTemplates.toarray()
  }

  getBlockTemplate () { // Promise
    throw new Error('Not implemented')
  }

  submit (block) {
    throw new Error('Not implemented')
  }

  validateAddress () {
    throw new Error('Not implemented')
  }
}

module.exports = Coin
