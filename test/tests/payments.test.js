/* global describe, test, expect */

'use strict'

const Hapi = require('hapi')

describe('Validate PPLNS service', () => {
  const server = Hapi.server({ autoListen: false })
  server.register([
    {
      name: 'coins',
      register: (server, options) => {
        server.expose('monero', {
          on: () => {},
          getBlockHeaderByHeight: (i) => Promise.resolve({ height: i, reward: 11.195100 * 100000000, difficulty: 3153343339 })
        })
      }
    },
    {
      name: 'model',
      register: (server, options) => {
        server.expose('Blocks', {
          getValid: (c) => Promise.resolve([ { height: 1124524, save: () => {} } ])
        })
        server.expose('Shares', {
          getByHeight: (i) => Promise.resolve(Array.apply(null, new Array(4)).map(() => ({ height: i, address: Math.random() > 0.3 ? 'A' : 'B', hashCount: 50 * 1000 * 120 })))
        })
      }
    },
    {
      plugin: require('../../src/payments')
    }
  ])

  test('validate payments with fake model', () => {
    const payments = server.plugins.payments
    return expect(payments.getRewards()).resolves.toBeInstanceOf(Object)
  })
})
