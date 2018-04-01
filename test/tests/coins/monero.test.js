/* global describe, test, expect */

'use strict'

const Monero = require('../../../src/coins/monero')
const RPC = require('../../mock/rpc')
const address = 'X'

describe('Monero block template', () => {
  const monero = new Monero(address, new RPC())
  test('it has a height property', () => {
    return expect(monero._getBlockTemplate()).resolves.toHaveProperty('height')
  })
  test('it has a difficulty property', () => {
    return expect(monero._getBlockTemplate()).resolves.toHaveProperty('difficulty')
  })
  test('it has a reservedOffset property', () => {
    return expect(monero._getBlockTemplate()).resolves.toHaveProperty('reservedOffset')
  })
})
