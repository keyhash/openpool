'use strict'

const EventEmitter = require('events')

const LINE_FEED = Buffer.from('\n', 'utf8')
const MAX_MESSAGE_SIZE = 10 * 1024

class Connection extends EventEmitter {
  constructor (id, socket, separator = LINE_FEED, maxMessageSize = MAX_MESSAGE_SIZE) {
    super()
    this.id = id
    this.socket = socket
    this.buffer = Buffer.alloc(0)
    this.length = 0
    this.active = false
  }

  stop (reason) {
    if (this.active) {
      this.active = false
      this.emit('stop', reason)
      this.socket.destroy()
      this.socket.removeListener('data', this.onData)
      this.socket.removeListener('close', this.onClose)
      this.socket.removeListener('error', this.onError)
      this.removeAllListeners('message')
      this.removeAllListeners('stop')
    }
  }

  reply (data) {
    if (!this.socket.writable) {
      // @todo stop connection ?
      return
    }
    this.socket.write(data + '\n')
  }

  start () {
    if (this.active) {
      return
    }
    this.onData = (data) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        console.warn(`${this.id} send an excessive aumount of data: ${data.length} bytes.`)
        this.close()
      }

      // Concatenate the existing buffer with new data
      const buffer = Buffer.alloc(this.buffer.length + data.length)
      this.buffer.copy(buffer)
      data.copy(buffer, this.buffer.length)

      // Slice the buffer into messages
      let pos = 0
      let index = -1
      while ((index = buffer.indexOf(LINE_FEED, pos)) >= 0) {
        const message = buffer.slice(pos, index)
        this.emit('message', message)
        pos = index + 1
      }

      // Allocate buffer for incomplete data
      this.buffer = Buffer.alloc(buffer.length - pos)
      buffer.copy(this.buffer, 0, pos)
    }
    this.onClose = () => {
      this.stop()
    }
    this.onError = (err) => {
      console.error(err)
    }
    this.socket.on('data', this.onData)
    this.socket.on('close', this.onClose)
    this.socket.on('error', this.onError)
    this.active = true
  }
}

module.exports = Connection
