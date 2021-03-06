'use strict'

const { STRING, DOUBLE, INTEGER } = require('sequelize')

module.exports = (sequelize, options) => {
  const Accounts = sequelize.define('Accounts', {
    address: {
      type: STRING,
      allowNull: false
    },
    coinCode: {
      type: STRING,
      allowNull: false
    },
    valid: {
      type: INTEGER,
      allowNull: false,
      validate: { min: 0 },
      defaultValue: 0
    },
    invalid: {
      type: INTEGER,
      allowNull: false,
      validate: { min: 0 },
      defaultValue: 0
    },
    hashes: {
      type: INTEGER,
      allowNull: false,
      validate: { min: 0 },
      defaultValue: 0
    },
    balance: {
      type: DOUBLE,
      allowNull: false,
      defaultValue: 0
    },
    accumulated: {
      type: DOUBLE,
      allowNull: false,
      defaultValue: 0
    },
    paymentThreshold: {
      type: DOUBLE,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    paranoid: false
  })

  return Accounts
}
