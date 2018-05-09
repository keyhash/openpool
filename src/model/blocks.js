'use strict'

const { STRING, INTEGER, BIGINT, BOOLEAN, Op: { gte } } = require('sequelize')

module.exports = (sequelize, options) => {
  const Blocks = sequelize.define('Blocks', {
    hash: {
      type: STRING,
      allowNull: false
    },
    coinCode: {
      type: STRING,
      allowNull: false
    },
    height: {
      type: INTEGER,
      allowNull: false,
      validate: { min: 0 }
    },
    difficulty: {
      type: BIGINT,
      allowNull: false,
      validate: { min: 0 }
    },
    locked: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    paranoid: false,
    updatedAt: false
  })
  Blocks.getValid = (height) => {
    return Blocks.findAll({
      where: { locked: true, height: { [gte]: height } },
      order: [ ['height', 'ASC'] ]
    })
  }
  return Blocks
}
