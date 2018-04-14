'use strict'

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const sequelize = server.plugins.database.sequelize

    const Accounts = require('./accounts')(sequelize, options)
    const Shares = require('./shares')(sequelize, options)
    const Blocks = require('./blocks')(sequelize, options)
    const Transactions = require('./transactions')(sequelize, options)

    // The following models are not persisted
    const Jobs = require('./jobs')()
    const Miners = require('./miners')({ Blocks, Jobs, Shares })

    server.expose({ Accounts, Blocks, Miners, Shares, Transactions })
  }
}
