'use strict'

const PPLNS_FEE = 1
const SHARE_MULTIPLIER = 2
// const PAYMENT_ROUND_INTERVAL = 60 * 60 * 1000
const PAYMENT_ROUND_INTERVAL = 5 * 1000
const MINING_REWARD_UNLOCK = 60
const TRANSACTION_PRIORITY = 0
const TRANSACTION_UNLOCK_TIME = 0
const TRANSACTION_MIXIN = 0

const Debug = require('debug')
const logger = Debug('payments')

const sequelize = require('sequelize')

const POOL_ADDRESS = '9wviCeWe2D8XS82k2ovp5EUYLzBt9pYNW2LXUFsZiv8S3Mt21FZ5qQaAroko1enzw3eGr9qC7X1D7Geoo2RrAotYPwq9Gm8'

let paymentsOngoing = false

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    const coin = server.plugins.coins.monero
    const { Blocks, Shares, Accounts, Transactions } = server.plugins.model

    const getRewards = async (height) => {
      const payments = {}
      const blocks = await Blocks.getValid(height)
      for (let block of blocks) {
        const blockHeader = await coin.getBlockHeaderByHeight(block.height)
        let height = blockHeader.height
        let amountPaid = 0
        while (amountPaid < blockHeader.reward && height > 0) {
          const shares = await Shares.getByHeight(height)
          for (let share of shares) {
            let shareReward = Math.floor((share.hashCount * blockHeader.reward) / (blockHeader.difficulty * SHARE_MULTIPLIER))
            if (amountPaid + shareReward > blockHeader.reward) {
              shareReward = blockHeader.reward - amountPaid
            }
            const poolReward = shareReward * (PPLNS_FEE / 100)
            amountPaid += shareReward // amountToPay = (miner + fee)
            const minerReward = shareReward - poolReward // amountToPay
            payments[share.address] = (payments[share.address] || 0) + minerReward
            payments[POOL_ADDRESS] = (payments[POOL_ADDRESS] || 0) + poolReward
          }
          height--
        }
        block.locked = false
        block.save()
      }
      return payments
    }

    const doPayments = async () => {
      const accounts = await Accounts.getAccountsForPayment(coin.getPaymentThreshold())
      const transactions = []
      for (let account of accounts) {
        await sequelize.transaction()
          .then(async t => {
            try {
              const transaction = Transactions.build({
                address: account.address,
                amount: account.balance,
                fee: coin.getTransactionFee(account.balance)
              })
              account.balance = 0
              await account.save({ transaction: t })
              await transaction.save({ transaction: t })
              await t.commit()
              transactions.push(transaction)
            } catch (err) {
              logger(`Failed to create a transaction for ${account.address} ${err.stack}`)
              await t.rollback()
            }
          })
      }

      while (transactions.length > 0) {
        const sliceOfTransactions = transactions.splice(0, coin.getMaxmimumDestinationsPerTransaction())
        const destinations = sliceOfTransactions.map(transaction => ({
          amount: Math.floor(transaction.amount - transaction.fee),
          address: transaction.address
        }))
        try {
          const coinTransaction = await coin.transfer({
            unlock_time: TRANSACTION_UNLOCK_TIME,
            get_tx_hex: true,
            destinations,
            priority: TRANSACTION_PRIORITY,
            mixin: TRANSACTION_MIXIN
          })
          logger(`Transaction created: ${coinTransaction.tx_hash}`)
          for (let transaction of sliceOfTransactions) {
            transaction.transactionHash = coinTransaction.tx_hash
            transaction.executedAt = new Date()
            transaction.save()
          }
        } catch (err) {
          // @todo
          logger(`Failed to execute transaction: ${err.stack}`)
        }
      }
    }

    // Update balance
    coin.on('blockHeader', async blockHeader => {
      if (paymentsOngoing) {
        return
      }
      paymentsOngoing = true
      const height = blockHeader.height - MINING_REWARD_UNLOCK
      if (height > 0) {
        const rewards = await getRewards(height)
        for (let address in rewards) {
          const amount = rewards[address]
          await Accounts.findOrCreate({
            where: { address },
            defaults: { coinCode: coin.code, balance: 0, accumulated: 0 }
          }).spread((account, created) => {
            account.balance += amount
            account.accumulated += amount
            account.save()
          })
        }
      }
      paymentsOngoing = false
    })

    server.expose('doPayments', doPayments)
    server.expose('getRewards', getRewards)

    server.ext('onPreStart', () => {
      setInterval(doPayments, PAYMENT_ROUND_INTERVAL)
      doPayments()
    })
  }
}
