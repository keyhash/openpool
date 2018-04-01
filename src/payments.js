'use strict'

const PPLNS_FEE = 1
const SHARE_MULTIPLIER = 2

module.exports = function ({ Blocks, Shares }) {
  class Payments {
    constructor (options, coin) {
      this.options = options
      this.coin = coin
    }

    start () {
      this.coin.on('blockHeader', blockHeader => {
        this.getPayments()
      })
    }

    getPayments () {
      const allBlockPayments = []
      const payments = {}
      Blocks.getValid(block => {
        allBlockPayments.push(this.coin.getBlockHeaderByHeight(block.height)
          .then(blockHeader =>
            new Promise((resolve, reject) => {
              let height = blockHeader.height
              let totalPaidToMiners = 0
              while (totalPaidToMiners < blockHeader.reward && height > 0) {
                Shares.get(height, share => {
                  let shareReward = Math.floor((share.hashCount * blockHeader.reward) / (blockHeader.difficulty * SHARE_MULTIPLIER))
                  if (totalPaidToMiners + shareReward > blockHeader.reward) {
                    shareReward = blockHeader.reward - totalPaidToMiners
                  }
                  const poolReward = shareReward * (PPLNS_FEE / 100)
                  totalPaidToMiners += shareReward // amountToPay = (miner + fee)
                  const minerReward = shareReward - poolReward // amountToPay
                  payments[share.address] = (payments[share.address] || 0) + minerReward
                  payments['pool'] = (payments['pool'] || 0) + poolReward
                })
                height--
              }
              console.log('Profits where shared for miners that submitted shares in the ' + (blockHeader.height - height) + ' last blocks')
              resolve(payments)
            })
          )
        )
        block.locked = false
        Blocks.set(block)
      })
      return Promise.all(allBlockPayments)
        .then(allBlockPayments => {
          console.log(`Done processing blocks & shares`)
          return allBlockPayments
        })
    }
  }

  return Payments
}
