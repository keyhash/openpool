'use strict'

const { STRING, BIGINT, DATE } = require('sequelize')

module.exports = (sequelize, options) => {
  const Transactions = sequelize.define('Transactions', {
    address: {
      type: STRING,
      allowNull: false
    },
    amount: {
      type: BIGINT,
      allowNull: false
    },
    fee: {
      type: BIGINT,
      allowNull: false
    },
    executedAt: {
      type: DATE,
      allowNull: true
    },
    transactionHash: {
      type: STRING,
      allowNull: true
    }
  })
  return Transactions
}
