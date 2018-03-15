'use strict'

const Joi = require('joi')
const EventEmitter = require('events')

const RPC_MESSAGE_SCHEMA = Joi.object({
  id: Joi.string()
    .when('method', {
      is: 'getjob',
      then: Joi.string().required()
    })
    .when('submit', {
      is: 'keepalived',
      then: Joi.string().required()
    })
    .when('method', {
      is: 'keepalived',
      then: Joi.string().required()
    }),
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
      then: Joi.object().keys([])
    })
    .when('method', {
      is: 'submit',
      then: Joi.object({
        job_id: Joi.string().required(),
        nonce: Joi.string().required(),
        poolNonce: Joi.string(),
        workerNonce: Joi.string(),
        result: Joi.string()
      }).required()
    })
    .when('method', {
      is: 'keepalived',
      then: Joi.object().keys([])
    })
})

const defaults = { jsonrpc: '2.0' }

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
        const result = Joi.validate(message, RPC_MESSAGE_SCHEMA)
        if (result.error) {
          this.connection.stop(new Error('Failed to validate message'))
        }
        const { value: { id, method, params } } = result
        this.emit('message', { id, method, params })
      } catch (err) {
        this.connection.stop(new Error('Failed to parse message'))
      }
    }
    this.onStop = (reason) => {
      console.error('error', reason)
      this.stop(reason)
    }
    this.connection.on('message', this.onMessage)
    this.connection.once('stop', this.onStop)
    this.connection.start()
    this.active = true
  }

  reply (message) {
    this.connection.reply(JSON.stringify(Object.assign({}, defaults, message)))
  }

  stop (reason) {
    if (this.active) {
      this.connection.stop()
      this.emit('stop', reason)
      this.removeAllListeners('message')
      this.removeAllListeners('stop')
    }
  }
}

module.exports = StratumConnection
