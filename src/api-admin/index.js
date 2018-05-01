'use strict'

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { Accounts, Transactions } = server.plugins.model

    server.route({
      path: '/payments',
      method: 'GET',
      handler: (request, h) => {
        return Transactions.findAll()
      }
    })

    server.route({
      path: '/payments/{address}',
      method: 'GET',
      handler: ({ params: { address } }, h) => {
        return Transactions.find({ address })
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
        return Accounts.find({ address })
      }
    })
  }
}
