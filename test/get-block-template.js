'use strict'

const RPC = require('../src/network/rpc')
const rpc = new RPC({ uri: 'http://localhost:18081/json_rpc' })
const wallet_address = '48Tk9eL8pLHWnKEJfocXQgcBcLkymp6mUKjxQgZXoR1riGjfjznsrLgNZMbfDeWC7hYY1qfHFTe7mFCRdbsvkfimLAq4AvB' // eslint-disable-line camelcase

rpc.request('getblocktemplate', { reserve_size: 17, wallet_address })
  .then(response => {
    console.log(JSON.stringify(response))
  })
  .catch(err => {
    console.error('Failed to obtain block template: ' + err)
  })
