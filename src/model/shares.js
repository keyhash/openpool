'use strict'

const { STRING, INTEGER, BOOLEAN } = require('sequelize')

module.exports = (sequelize, options) => {
  let minimumHeight = 0

  const Shares = sequelize.define('Shares', {
    height: {
      type: INTEGER,
      allowNull: false
    },
    address: {
      type: STRING,
      allowNull: false
    },
    hashCount: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    match: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    paranoid: false,
    updatedAt: false,
    hooks: {
      afterBulkDestroy: async (options) => {
        minimumHeight = await Shares.min('height')
      }
    }
  })

  Shares.getByHeight = async (height) => {
    if (minimumHeight === 0) {
      minimumHeight = await Shares.min('height')
    }
    if (height >= minimumHeight) {
      return Shares.findAll({
        where: { height },
        raw: true
      })
    } else {
      return []
    }
  }

  return Shares
}
