'use strict'

const Network = require('net')
const Ini = require('ini')
const Fs = require('fs')
const Uuid = require('uuid/v4')
const EventEmitter = require('events')

const RPC = require('../test/mock/rpc')
const Monero = require('./coins/monero')

const Miner = require('./classes/miner')
const BlockTemplateManager = require('./classes/block-template-manager')
const Connection = require('./network/connection')
const StratumConnection = require('./network/stratum-connection')

module.exports = new Promise((resolve, reject) => {
  // @todo: validate configuration, reject in case of failure
  const Config = Ini.parse(Fs.readFileSync('./config.ini', 'utf-8'))

  const daemonRpc = new RPC()

  const coin = new Monero(daemonRpc)
  const emitter = new EventEmitter()
  const miners = new Map()
  const blockTemplateManager = new BlockTemplateManager(coin, Config.poolAddress)

  blockTemplateManager.on('blockTemplate', activeBlockTemplate => {
    miners.forEach(miner => {
      const { connection } = miner
      connection.reply({ method: 'job', params: miner.getJob(activeBlockTemplate) })
    })
  })
  blockTemplateManager.start()

  Network.createServer(onConnection)
    .listen(Config.port, Config.bindAddress, onStartup)

  function onStartup (reason) {
    if (reason) {
      reject(reason)
    }
    resolve(`Pool started @ ${Config.bindAddress}:${Config.port}`)
  }

  function onConnection (socket) {
    console.log('A new connection arrived !')

    // @todo: check for banned IP addresses here

    socket.setKeepAlive(true)

    const connection = new Connection(Uuid(), socket)
    const stratumConnection = new StratumConnection(connection)

    // Message router: handles the messages sent from the miners.
    // There are four possible operations: auth, getjob, submit, keepalived
    // At this point `message` is parsed and correctly formed for the given operation.
    stratumConnection.on('message', (message) => {
      const { id, method } = message
      console.log(`Request: ${id || 'n/a'} Method: ${method}`)
      if (method === 'login') {
        emitter.emit(method, message, stratumConnection)
      } else {
        const miner = miners.get(id)
        if (!miner) {
          stratumConnection.reply({ error: 'Unauthenticated' })
          return
        }
        miner.heartbeat()
        emitter.emit(method, message, miner)
      }
    })

    stratumConnection.once('close', miner => {
      miners.delete(miner.id)
    })

    stratumConnection.start()
  }

  /**
   * Registers the miner in the miner list and provides a job for the miner
   */
  emitter.on('login', ({ params: { login, agent } }, connection) => {
    if (connection.miner) {
      console.warn('A connection is being reused to authenticate a new miner')
      miners.delete(connection.miner.id)
    }
    try {
      const address = login
      const miner = new Miner(Uuid(), address, agent, coin, connection)
      connection.miner = miner
      miners.set(miner.id, miner)
      miner.connection.reply({ id: miner.id, job: miner.getJob(blockTemplateManager.activeBlockTemplate), status: 'OK' })
    } catch (err) {
      connection.reply({ error: err })
    }
  })

  /**
   * Searches for a new job to assign to the miner
   */
  emitter.on('getjob', (message, miner) => {
    miner.connection.reply({ method: 'job', params: miner.getJob(blockTemplateManager.activeBlockTemplate) })
  })

  /**
   * Handles new a miner submission
   */
  emitter.on('submit', ({ params: { jobId, job_id } }, miner) => { // eslint-disable-line camelcase
    const job = miner.findJob(jobId)
    if (!job) {
      miner.connection.reply({ id: miner.id, error: 'Invalid job id' })
      return
    }
    // Handle submission
    miner.connection.reply({ status: 'OK' })
  })

  /**
   * This is used by the miners to avoid the connection to be cut
   * when there is not activity on the socket
   */
  emitter.on('keepalived', (message, miner) => {
    miner.connection.reply({ id: miner.id, status: 'KEEPALIVED' })
  })
})
