/* global describe, test, expect */

'use strict'

const Monero = require('../../src/coins/monero')
const RPC = require('../mock/rpc')

describe('Monero block template', () => {
  const monero = new Monero(new RPC())
  test('it has a height property', () => {
    return expect(monero.getBlockTemplate()).resolves.toHaveProperty('height')
  })
  test('it has a difficulty property', () => {
    return expect(monero.getBlockTemplate()).resolves.toHaveProperty('difficulty')
  })
  test('it has a reservedOffset property', () => {
    return expect(monero.getBlockTemplate()).resolves.toHaveProperty('reservedOffset')
  })
})
