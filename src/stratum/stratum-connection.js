'use strict'

const Joi = require('joi')
const EventEmitter = require('events')
const Debug = require('debug')
const logger = Debug('stratum-connection')

const RPC_MESSAGE_SCHEMA = Joi.object({
  id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  jsonrpc: Joi.string().valid(['2.0']),
  method: Joi.string().valid(['login', 'getjob', 'submit', 'keepalived']).required(),
  params: Joi.object()
    .when('method', {
      is: 'login',
      then: Joi.object({
        login: Joi.string().required(),
        pass: Joi.string().required(),
        agent: Joi.string()
      }).required()
    })
    .when('method', {
      is: 'getjob',
      then: Joi.object({
        id: Joi.string().uuid({ version: ['uuidv4'] }).required()
      }).keys(['id'])
    })
    .when('method', {
      is: 'submit',
      then: Joi.object({
        id: Joi.string().uuid({ version: ['uuidv4'] }).required(),
        job_id: Joi.string().required(),
        nonce: Joi.string().alphanum().length(8).lowercase().required(),
        result: Joi.string()
      }).required()
    })
    .when('method', {
      is: 'keepalived',
      then: Joi.object({
        id: Joi.string().uuid({ version: ['uuidv4'] }).required()
      }).keys(['id'])
    })
})

const responseDefaults = { jsonrpc: '2.0' }

class StratumConnection extends EventEmitter {
  constructor (connection) {
    super()
    this.connection = connection
    this.active = false
  }

  start () {
    if (this.active) {
      return
    }
    this.onMessage = (data) => {
      try {
        const message = JSON.parse(data.toString())
        logger('[<] client', message)
        const result = Joi.validate(message, RPC_MESSAGE_SCHEMA)
        if (result.error) {
          // @todo ban-check
          this.connection.stop(new Error(`Failed to validate message: ${result.error}`))
        }
        const { value: { id, method, params } } = result
        this.emit('message', { id, method, params })
      } catch (err) {
        // @todo: log stack trace here
        this.connection.stop(new Error(`Failed to handle message: ${err.stack}`))
      }
    }
    this.onStop = (err) => {
      logger(`[!] connection stop: ${err.stack} ${Error().stack}`)
      this.emit('stop', err)
      this.removeAllListeners('message')
      this.removeAllListeners('stop')
    }
    this.connection.on('message', this.onMessage)
    this.connection.once('stop', this.onStop)
    this.connection.start()
    this.active = true
  }

  remoteAddress () {
    if (this.connection) {
      return this.connection.remoteAddress
    }
  }

  reply (message) {
    const response = Object.assign({}, responseDefaults, message)
    logger('[>] server: ', response)
    this.connection.reply(JSON.stringify(response))
  }

  stop (reason) {
    if (this.active) {
      this.active = false
      this.connection.stop()
    }
  }
}

module.exports = StratumConnection
