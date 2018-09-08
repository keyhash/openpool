'use strict'

const EventEmitter = require('events')
const Debug = require('debug')
const Uuid = require('uuid/v4')

const logger = Debug('pool')
const statisticsLogger = Debug('statistics')
const sequelize = require('sequelize')

const LOGIN_REGEX = /^([a-z0-9]{95,106})(\+(\d+))?$/i // address, difficulty

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { STATISTIC_LOG_INTERVAL, MINER_PRUNE_INTERVAL, MINER_MAX_INACTIVITY, MINER_HASH_COUNT_UPDATE } = options.pools

    const Fail2ban = server.plugins.fail2ban
    const Push = server.plugins.push
    const { Accounts, Miners } = server.plugins.model

    for (let [coinName, pools] of Object.entries(options.pool)) {
      const coin = server.plugins.coins[coinName]
      if (!coin) {
        logger(`[!] You configured a pool for a coin that is not configured '${coinName}'.`)
        continue
      }
      for (let [poolName, configuration] of Object.entries(pools)) {
        startPool(coin, poolName, configuration)
      }
    }

    async function startPool (coin, poolName, configuration) {
      const stratumServer = await server.methods.stratum(configuration)
      const emitter = new EventEmitter()
      const minerPool = new Map()

      let miners = 0 // all time number of miner connected to the pool
      let shares = 0 // all time number of shares processed
      let trusted = 0 // all time number of trusted shares processed
      let hashes = 0 // number of hashes processed since last average computation

      server.ext('onPostStart', () => {
        logger(`[#] Starting now '${coin.name} ${poolName}' ${configuration.ADDRESS}:${configuration.PORT}`)
        stratumServer.start()
      })

      coin.on('blockTemplate', blockTemplate => {
        minerPool.forEach(miner => {
          const { connection } = miner
          connection.reply({ method: 'job', params: miner.createJob(blockTemplate) })
        })
      })

      const onConnection = (connection) => {
        // Message router: handles the messages sent from the miners.
        // There are four possible operations: auth, getjob, submit, keepalived
        // At this point `message` is parsed and correctly formed for the given operation.
        connection.on('message', (message) => {
          const { method, params: { id } } = message
          logger(`[>] Miner: ${id || 'n/a'} Method: ${method}`)
          if (method === 'login') {
            emitter.emit(method, message, connection, coin)
          } else {
            const miner = minerPool.get(id)
            if (!miner) {
              connection.reply({ error: 'Unauthenticated' })
              return
            }
            miner.ping()
            emitter.emit(method, message, miner)
          }
        })
      }

      /**
       * Registers the miner in the miner list and provides a job for the miner
       */
      emitter.on('login', ({ id, params: { login, agent } }, connection, coin) => {
        if (connection.miner) {
          logger('[!] A connection is being reused to authenticate a new miner')
          minerPool.delete(connection.miner.id)
        }
        try {
          const [ , address, , difficulty ] = login.match(LOGIN_REGEX)
          const miner = Miners.build({ id: Uuid(), address, difficulty, agent, coin, connection })
          connection.miner = miner
          minerPool.set(miner.id, miner)
          miners++
          miner.once('stop', (reason) => minerPool.delete(miner.id))
          miner.once('undesirable', async () => {
            await Fail2ban.permanent(this.remoteAddress)
            miner.stop('undesirable')
          })
          miner.login(id)
        } catch (err) {
          connection.reply({ id, jsonrpc: '2.0', error: err })
        }
      })

      /**
       * This is used by the miners to avoid the connection to be cut
       * when there is not activity on the socket
       */
      emitter.on('keepalived', ({ id }, miner) => miner.keepalived(id))

      /**
       * Searches for a new job to assign to the miner
       */
      emitter.on('getjob', (_, miner) => miner.sendJob())

      /**
       * Handles new a miner submission
       */
      emitter.on('submit', async ({ id, params: { job_id, nonce, result } }, miner) => { // eslint-disable-line camelcase
        let share = false

        let tOk = false
        while (!tOk) {
          // Transaction can fail due to concurrent update.
          // See: https://www.postgresql.org/docs/9.1/static/transaction-iso.html#XACT-REPEATABLE-READ
          const t = await sequelize.transaction({ autocommit: false })
          try {
            const [ account ] = await Accounts.findOrCreate({
              where: { address: miner.address },
              defaults: { coinCode: coin.code, balance: 0, accumulated: 0 },
              transaction: t,
              lock: t.LOCK.UPDATE
            })

            if (share === false) {
              // if the transaction fails this part must not be executed again
              // at the end of this block we ensure that `share` will not be false.
              try {
                share = await miner.submit(job_id, Buffer.from(nonce, 'hex'), Buffer.from(result, 'hex'))
                trusted = share.trusted ? trusted + 1 : trusted
                hashes += share.hashCount
                shares++
                miner.valid++
                miner.reply({ id, jsonrpc: '2.0', result: { status: 'OK' } })
              } catch (err) {
                miner.invalid++
                miner.reply({ id, jsonrpc: '2.0', error: err.message })
                share = undefined
              }
            }

            if (share) {
              // this must be executed on each transaction attempt
              share.accountId = account.id
              share.save({ transaction: t })
              account.valid++
              account.hashes += share.hashCount
            } else {
              account.invalid++
            }

            await account.save({ transaction: t })

            t.commit()
            tOk = true
          } catch (err) {
            t.rollback()
            logger(`[!] Failed to find or create an account and save share: ${miner.address}: ${err.stack}`)
          }
        }
        miner.sendJob()
      })

      stratumServer.on('connection', onConnection)

      // Statistics
      setInterval(async () => {
        coin.getBlockTemplate().then(blockTemplate => {
          statisticsLogger(`[#] '${coin.name} ${poolName}' Miners: ${minerPool.size} Total Miners: ${miners} Shares: ${shares} Trusted: ${trusted}`)
          Push.publish({
            topic: `pool/${coin.code}/statistics`,
            payload: {
              shares,
              miners,
              poolHashRate: hashes / (STATISTIC_LOG_INTERVAL / 1000),
              networkHashRate: blockTemplate.difficulty
            }
          })
          hashes = 0
        })
      }, STATISTIC_LOG_INTERVAL)

      // Prune inactive miners
      setInterval(() => {
        let inactive = 0
        minerPool.forEach(miner => {
          if (Date.now() - miner.heartbeat > MINER_MAX_INACTIVITY) {
            miner.stop() // Stop connection, which in turn will remove it from the minerPool
            inactive++
          }
        })
        if (inactive) {
          logger(`[!] Pruned ${inactive} inactive miners.`)
        }
      }, MINER_PRUNE_INTERVAL)

      // Update difficulty
      setInterval(() => {
        minerPool.forEach(miner => miner.updateDifficulty())
      }, MINER_HASH_COUNT_UPDATE)
    }
  }
}
