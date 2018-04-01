/* global describe, test, expect */

'use strict'

function mockCoin (blocks) {
  return {
    getBlockHeaderByHeight: (i) => Promise.resolve({ height: i, reward: 11.195100 * 100000000, difficulty: 3153343339 })
  }
}

function mockModel (blocks) {
  return {
    Blocks: {
      getValid: (c) => blocks.forEach(block => c(block)),
      set: () => {}
    },
    Shares: {
      get: (i, c) => c({ height: i, address: Math.random() > 0.3 ? 'A' : 'B', hashCount: 50 * 1000 * 120 })
    }
  }
}

describe('Validate PPLNS service', () => {
  test('validate payments with fake model', () => {
    const blocks = [ { height: 1124524 } ]
    const Payments = require('../../src/payments')(mockModel(blocks))
    const p = new Payments({}, mockCoin())
    return expect(p.getPayments()).resolves.toBeInstanceOf(Array)
  })
})

describe('Realistic PPLNS service', () => {
  const LMDB = require('../../src/lmdb')
  const lmdb = new LMDB()
  lmdb.start()
  const Model = require('../../src/model')(lmdb)
  const blocks = [ { height: 1124524 } ]
  Model.Blocks = mockModel(blocks).Blocks

  test('validate payments with real db model', () => {
    const Payments = require('../../src/payments')(Model)
    const p = new Payments({}, mockCoin())
    return expect(p.getPayments()).resolves.toBeInstanceOf(Array)
  })
})
