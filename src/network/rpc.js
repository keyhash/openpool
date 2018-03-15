'use strict'

const Request = require('request-promise-native')

class RPC {
  constructor (options) {
    const { uri, authorization: { username, password } = {} } = options
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
          sendImmediately: true
        }
      })
    }
  }
  request (method, params) {
    const body = { id: '0', jsonrpc: '2.0', method, params }
    return Request(Object.assign({}, this.defaults, { body }))
  }
}

module.exports = RPC
