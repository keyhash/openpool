'use strict'

const Debug = require('debug')
const logger = Debug('payments')

const sequelize = require('sequelize')
const { Op: { col, gte, and } } = require('sequelize')

// const POOL_ADDRESS = '9wviCeWe2D8XS82k2ovp5EUYLzBt9pYNW2LXUFsZiv8S3Mt21FZ5qQaAroko1enzw3eGr9qC7X1D7Geoo2RrAotYPwq9Gm8'
const POOL_ACCOUNT_ID = 1

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const { Blocks, Shares, Accounts, Transactions } = server.plugins.model
    const { PAYMENT_ROUND_INTERVAL, PPLNS_FEE, PPLNS_SHARE_MULTIPLIER } = options.payments

    const paymentsOngoingByCoin = new Map()

    // PPLNS
    const getRewards = async (coin, height) => {
      let lowestRewardShare = Number.MAX_SAFE_INTEGER
      const payments = {}
      const blocks = await Blocks.getValid(height)
      for (let block of blocks) {
        const blockHeader = await coin.getBlockHeaderByHeight(block.height)
        let height = blockHeader.height
        let amountPaid = 0
        while (amountPaid < blockHeader.reward && height > 0) {
          const shares = await Shares.getByHeight(coin.code, height)
          for (let share of shares) {
            let shareReward = Math.floor((share.hashCount * blockHeader.reward) / (blockHeader.difficulty * PPLNS_SHARE_MULTIPLIER))
            if (amountPaid + shareReward > blockHeader.reward) {
              shareReward = blockHeader.reward - amountPaid
            }
            const poolReward = shareReward * (PPLNS_FEE / 100)
            amountPaid += shareReward // amountToPay = (miner + fee)
            const minerReward = shareReward - poolReward // amountToPay
            payments[share.accountId] = (payments[share.accountId] || 0) + minerReward
            payments[POOL_ACCOUNT_ID] = (payments[POOL_ACCOUNT_ID] || 0) + poolReward
          }
          height--
          lowestRewardShare = Math.min(lowestRewardShare, height)
        }
        block.locked = false
        try {
          await block.save()
        } catch (err) {
          logger(`[!] Failed to unlock block ${block.height}: ${err.stack}`)
        }
      }
      return [ payments, lowestRewardShare ]
    }

    const clearShares = (coin, height) => {
      if (height === Number.MAX_SAFE_INTEGER) {
        logger(`Skipping removal of shares: rewards not yet calculated.`)
        return
      }
      return Shares.clearUnder(coin.code, height)
    }

    const doPayments = async () => {
      const batches = Object.values(server.plugins.coins).map(async (coin) => {
        logger(`[$] Starting payments for ${coin.code}`)

        const transactions = []

        let tOk = false
        while (!tOk) {
          // Transaction can fail due to concurrent update.
          // See: https://www.postgresql.org/docs/9.1/static/transaction-iso.html#XACT-REPEATABLE-READ
          const t = await sequelize.transaction()
          try {
            const accounts = await Accounts.findAll({
              where: {
                [and]: [
                  { coinCode: coin.code },
                  { balance: { [gte]: coin.getPaymentThreshold() } },
                  { balance: { [gte]: { [col]: 'paymentThreshold' } } }
                ]},
              lock: t.LOCK.UPDATE,
              transaction: t
            })

            for (let account of accounts) {
              const transaction = Transactions.build({
                amount: account.balance,
                address: account.address,
                coinCode: coin.code,
                fee: coin.getTransactionFee(account.balance)
              })
              account.balance = 0
              await account.save({ transaction: t })
              await transaction.save({ transaction: t })
              transactions.push(transaction)
            }
            await t.commit()
            tOk = true
          } catch (err) {
            await t.rollback()
            logger(`[!] Failed to create transactions: ${err.stack}`)
          }
        }
        return processTransactions(coin, transactions)
      })
      return Promise.all(batches)
    }

    const processTransactions = async (coin, transactions) => {
      while (transactions.length > 0) {
        // Split transactions into batches
        const sliceOfTransactions = transactions.splice(0, coin.getMaxmimumDestinationsPerTransaction())
        const destinations = sliceOfTransactions.map(transaction => ({
          amount: Math.floor(transaction.amount - transaction.fee),
          address: transaction.address // can be integrated address
        }))
        try {
          const coinTransaction = await coin.transfer({
            get_tx_hex: true,
            destinations
          })
          logger(`Transaction created: ${coinTransaction.tx_hash}`)
          for (let transaction of sliceOfTransactions) {
            transaction.transactionHash = coinTransaction.tx_hash
            transaction.executedAt = new Date()
            transaction
              .save()
              .catch(err => {
                logger(`[!] Failed to mark transaction as executed: ${err.stack}`)
              })
          }
        } catch (err) {
          // @todo
          logger(`Failed to execute transaction: ${err.stack}`)
        }
      }
    }

    const doRetryFailedPayments = () => {
      Object.values(server.plugins.coins).forEach(coin => {
        const transactions = Transactions.getNotExecuted(coin.code)
        processTransactions(transactions)
      })
    }

    Object.values(server.plugins.coins).forEach(coin => {
      // Update balance
      coin.on('blockHeader', async blockHeader => {
        if (paymentsOngoingByCoin.has(coin.code)) {
          return
        }
        paymentsOngoingByCoin.set(coin.code, true)
        const height = blockHeader.height - coin.miningRewardUnlock
        if (height > 0) {
          const [ rewards, lowestRewardShare ] = await getRewards(coin, height)
          for (let accountId in rewards) {
            const amount = rewards[accountId]

            let tOk = false
            while (!tOk) {
              // Transaction can fail due to concurrent update.
              // See: https://www.postgresql.org/docs/9.1/static/transaction-iso.html#XACT-REPEATABLE-READ
              const t = await sequelize.transaction({ autocommit: false })
              try {
                const account = await Accounts.findOne({
                  where: { id: accountId },
                  lock: t.LOCK.UPDATE,
                  transaction: t
                })
                if (!account) {
                  logger(`[!] Failed to find account for payments: '${accountId}', failed to reward: ${amount}`)
                  await t.rollback()
                  tOk = true // success from a transaction standpoint
                  continue
                }
                account.balance += amount
                account.accumulated += amount
                await account.save({ transaction: t })
                await t.commit()
                tOk = true
              } catch (err) {
                await t.rollback()
                logger(`[!] Failed to update account ${accountId} balance +${amount}: ${err.stack}`)
              }
            }
          }
          await clearShares(coin, lowestRewardShare)
        }
        paymentsOngoingByCoin.delete(coin.code)
      })
    })

    server.expose('doPayments', doPayments)
    server.expose('doRetryFailedPayments', doRetryFailedPayments)
    server.expose('getRewards', getRewards)

    server.ext('onPostStart', () => {
      setInterval(doPayments, PAYMENT_ROUND_INTERVAL)
      return doPayments()
    })
  }
}
