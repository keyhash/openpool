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
    server.method('stratum', (options) =>

      new Promise((resolve, reject) => {
        const emitter = new EventEmitter()

        const onConnection = (socket) => {
          // @todo: check for banned IP accounts here
          socket.setKeepAlive(true)
          const connection = new Connection(Uuid(), socket)
          const stratumConnection = new StratumConnection(connection)
          emitter.emit('connection', stratumConnection)
          stratumConnection.start()
        }

        Network.createServer(onConnection)
          .listen(options.port, options.address, (err) => {
            if (err) {
              return reject(err)
            }
            logger(`Pool started @ ${options.address}:${options.port}`)
            resolve(emitter)
          })
      })

    )
  }
}
