'use strict'

const { STRING, INTEGER, BOOLEAN, Op: { lt } } = require('sequelize')

module.exports = (sequelize, options) => {
  const minimumHeightByCoin = new Map()

  const Shares = sequelize.define('Shares', {
    height: {
      type: INTEGER,
      allowNull: false
    },
    address: {
      type: STRING,
      allowNull: false
    },
    coinCode: {
      type: STRING,
      allowNull: false
    },
    hashCount: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    trusted: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    match: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    paranoid: false,
    updatedAt: false
  })

  Shares.getByHeight = async (coinCode, height) => {
    let minimumHeight = 0
    if (!minimumHeightByCoin.has(coinCode)) {
      minimumHeight = await Shares.min('height', { where: { coinCode } })
      minimumHeightByCoin.set(coinCode, minimumHeight)
    } else {
      minimumHeight = minimumHeightByCoin.get(coinCode)
    }

    if (height >= minimumHeight) {
      return Shares.findAll({
        where: { height, coinCode },
        raw: true
      })
    } else {
      return []
    }
  }

  Shares.clearUnder = async (coinCode, height) => {
    await Shares.destroy({
      where: {
        height: {
          [lt]: height
        }
      }
    })
    minimumHeightByCoin.set(coinCode, height)
  }

  return Shares
}
