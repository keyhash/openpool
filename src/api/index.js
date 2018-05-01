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
  }
}
