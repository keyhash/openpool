'use strict'

const RPC = require('./rpc')
const Monero = require('./monero')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const monerod = new RPC(options.monero.daemon)
    const wallet = new RPC(options.monero.wallet)
    const monero = new Monero(options.monero, monerod, wallet)
    server.expose('monero', monero)

    server.ext({
      type: 'onPreStart',
      method: () => {
        if (options.monero) {
          monero.start()
        }
      }
    })
  }
}
