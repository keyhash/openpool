'use strict'

const Ascoltatori = require('ascoltatori')
const Redis = require('redis')
const Hoek = require('hoek')
const Debug = require('debug')

const logger = new Debug('push')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { ADDRESS, PORT } = Hoek.applyToDefaults(
      { HOST: '127.0.0.1', PORT: 6379 },
      options.push.backend
    )

    const settings = {
      type: 'redis',
      redis: Redis,
      db: 12,
      port: PORT,
      host: ADDRESS
    }

    const ascoltatore = new Promise((resolve, reject) =>
      Ascoltatori.build(settings, (err, ascoltatore) => err ? reject(err) : resolve(ascoltatore)))

    server.expose('publish', ({ topic, payload }) => {
      logger('[*]', topic, JSON.stringify(payload))
      ascoltatore.then(server => server.publish(
        topic,
        payload,
        {
          qos: 0, // 0, 1, or 2
          retain: true // or false
        }
      ))
    })
  }
}
