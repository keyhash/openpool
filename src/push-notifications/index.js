'use strict'

const Mosca = require('mosca').Server
const Redis = require('redis')
const Hoek = require('hoek')

const pushBackendConfiguration = (options) => {
  const { HOST, PORT } = Hoek.applyToDefaults(
    { HOST: '127.0.0.1', PORT: 6379 },
    options.push.backend
  )
  return {
    type: 'redis',
    redis: Redis,
    db: 12,
    port: PORT,
    host: HOST
  }
}

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { HOST, PORT } = Hoek.applyToDefaults(
      { HOST: '127.0.0.1', PORT: 3000 },
      options.push
    )
    const settings = {
      host: HOST,
      http: {
        port: PORT,
        bundle: true,
        static: './'
      },
      backend: pushBackendConfiguration(options),
      logger: { level: 'debug' }
    }
    const mosca = new Mosca(settings)

    server.expose('publish', ({ topic, payload }) => {
      mosca.publish({
        topic,
        payload: JSON.stringify(payload),
        qos: 0, // 0, 1, or 2
        retain: true // or false
      })
    })
  }
}
