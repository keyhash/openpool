'use strict'

const { Daemon, Wallet } = require('monero-rpc')
const Monero = require('./monero')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    if (options.monero) {
      const daemon = new Daemon(options.monero.daemon.uri)
      const wallet = new Wallet(options.monero.wallet.uri)
      const monero = new Monero(options.monero, daemon, wallet)
      server.expose('monero', monero)
      server.ext('onPreStart', () => options.monero ? monero.start() : null)
    }
  }
}
