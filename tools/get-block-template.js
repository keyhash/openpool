'use strict'

/**
 * This program allows to fetch a block template from the monero daemon.
 */

const RPC = require('../src/network/rpc')
const rpc = new RPC({ uri: 'http://localhost:18081/json_rpc' })
const wallet_address = '' // eslint-disable-line camelcase

rpc.request('getblocktemplate', { reserve_size: 17, wallet_address })
  .then(response => {
    console.log(JSON.stringify(response))
  })
  .catch(err => {
    console.error('Failed to obtain block template: ' + err)
  })
