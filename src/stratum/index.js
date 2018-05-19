'use strict'

const Network = require('net')
const EventEmitter = require('events')
const Uuid = require('uuid/v4')

const Debug = require('debug')
const logger = Debug('stratum')

const Connection = require('./connection')
const StratumConnection = require('./stratum-connection')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    server.method('stratum', (options) => {
      const stratumServer = new EventEmitter()

      const onConnection = (socket) => {
        socket.setKeepAlive(true)
        const connection = new Connection(Uuid(), socket)
        const stratumConnection = new StratumConnection(connection)
        stratumServer.emit('connection', stratumConnection)
        stratumConnection.start()
      }

      stratumServer.start = () => {
        return new Promise((resolve, reject) => {
          Network.createServer(onConnection)
            .listen(options.PORT, options.ADDRESS, (err) => {
              if (err) {
                return reject(err)
              }
              logger(`Pool started @ ${options.ADDRESS}:${options.PORT}`)
              resolve(stratumServer)
            })
        })
      }
      return stratumServer
    })
  }
}
