'use strict'

const Ini = require('ini')
const Fs = require('fs')

const LMDB = require('./src/lmdb')
const Monero = require('./src/coins/monero')
const RPC = require('./src/network/rpc')

const configuration = Ini.parse(Fs.readFileSync('./config.ini', 'utf-8'))
const lmdb = new LMDB()
lmdb.start()

const Model = require('./src/model')(lmdb)
const Pool = require('./src/pool')(Model)
// const Payments = require('./src/payments')(Model)

const rpc = new RPC(configuration.monero)
const monero = new Monero(configuration.monero.address, rpc)
monero.start()

const pool = new Pool(configuration.pool, monero, Model)
pool.start()
  .then(pool => {
    console.log(pool)
  })

/*
const payments = new Payments(configuration.payments, monero)
payments.start()
*/
