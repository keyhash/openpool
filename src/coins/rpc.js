'use strict'

const Request = require('request-promise-native')

class RPC {
  constructor (options) {
    const { uri, username, password } = options
    this.defaults = {
      method: 'POST',
      uri,
      json: true
    }
    if (username && password) {
      Object.assign(this.defaults, {
        auth: {
          user: username,
          pass: password,
          sendImmediately: false
        }
      })
    }
  }
  request (method, params) {
    const body = { id: '0', jsonrpc: '2.0', method, params }
    const options = Object.assign({}, this.defaults, { body })
    if (method === 'transfer') {
      console.log(JSON.stringify(options))
    }
    return Request(options)
  }
}

module.exports = RPC
