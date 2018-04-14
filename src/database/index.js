'use strict'

const Sequelize = require('sequelize')
const Debug = require('debug')
const logger = Debug('sequelize')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const sequelize = new Sequelize(options.database.connectionUri, {
      operatorsAliases: false,
      logging: logger
    })
    server.expose('sequelize', sequelize)
    server.ext('onPreStart', () => {
      sequelize.sync()
    })
  }
}
