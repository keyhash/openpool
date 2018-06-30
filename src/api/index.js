'use strict'

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    server.route({
      path: '/coins/{coinCode}/statistics',
      method: 'GET',
      handler: ({ params: { coinCode } }, h) => {
        const coin = server.plugins.coins[coinCode]
        return coin.getLastBlockHeader()
      }
    })
    server.route({
      path: '/accounts/{address}/statistics',
      method: 'GET',
      handler: ({ params: { coinCode } }, h) => {
        // Pool hashrate

        // Miners

        // Last block found

        const coin = server.plugins.coins[coinCode]
        return coin.getLastBlockHeader()
      }
    })
  }
}
