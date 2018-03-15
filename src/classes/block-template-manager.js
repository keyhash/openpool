'use strict'

const EventEmitter = require('events')
const CircularBuffer = require('circular-buffer')

const TEMPLATE_INTERVAL = 1000

class BlockTemplateManager extends EventEmitter {
  constructor (coin, address, templateInterval = TEMPLATE_INTERVAL) {
    super()
    this.coin = coin
    this.address = address // pool address
    this.templateInterval = templateInterval
    this.activeBlockTemplate = null
    this.pastBlockTemplates = new CircularBuffer(4)
  }

  start () {
    setInterval(() => {
      this.coin.getBlockTemplate(this.address)
        .then(blockTemplate => {
          if (!this.activeBlockTemplate || (blockTemplate.height !== this.activeBlockTemplate.height)) {
            this.pastBlockTemplates.enq(this.activeBlockTemplate)
            this.activeBlockTemplate = blockTemplate
            this.emit('blockTemplate', this.activeBlockTemplate)
          }
        })
    }, this.templateInterval)
  }

  getActiveBlockTemplate () {
    return this.activeBlockTemplate
  }
}

module.exports = BlockTemplateManager
