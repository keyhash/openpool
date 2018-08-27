'use strict'

const Boom = require('boom')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { Accounts } = server.plugins.model

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
      handler: async ({ params: { address } }, h) => {
        const account = await Accounts.find({ where: { address } })
        if (!account) {
          throw Boom.notFound()
        }
        return account
      }
    })

    server.route({
      path: '/accounts',
      method: 'GET',
      handler: (request, h) => {
        return Accounts.findAll()
      }
    })

    server.route({
      path: '/accounts/{address}',
      method: 'GET',
      handler: ({ params: { address } }, h) => {
        return { balance: 8 }
        // return Accounts.find({ address })
        //   .then(account => account || Boom.notFound('Account not found'))
      }
    })
  }
}
