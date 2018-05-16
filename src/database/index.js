'use strict'

const Sequelize = require('sequelize')
const Debug = require('debug')
const logger = Debug('sequelize')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const sequelize = new Sequelize(options.database.CONNECTION_URI, {
      operatorsAliases: false,
      logging: logger
    })
    server.expose('sequelize', sequelize)
    server.ext('onPreStart', () => {
      if (!process.env.DATABASE) {
        process.env.DATABASE = options.database.CONNECTION_URI
        sequelize.sync()
      }
    })
  }
}
