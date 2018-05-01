'use strict'

const { STRING, BIGINT, DATE, Op: { eq } } = require('sequelize')

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
    },
    coinCode: {
      type: STRING,
      allowNull: true
    }
  })

  Transactions.getNotExecuted = coinCode => {
    return Transactions.findAll({
      where: {
        executedAt: {
          [eq]: null
        },
        coinCode
      }
    })
  }

  return Transactions
}
