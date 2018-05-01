'use strict'

const Debug = require('debug')
const logger = Debug('fail2ban')
const { exec } = require('child_process')

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    server.expose('permanent', (ipAddress) => {
      return new Promise((resolve, reject) => {
        logger(`[!] Permanently banning '${ipAddress}'`)
        // @todo: validate it is a valid address
        exec(`fail2ban-client set openpool-permanent banip ${ipAddress}`, (err) => err
          ? reject(err)
          : resolve()
        )
      })
    })

    server.expose('temporary', (ipAddress) => {
      return new Promise((resolve, reject) => {
        logger(`[!] Temporarily banning '${ipAddress}'`)
        // @todo: validate it is a valid address
        exec(`fail2ban-client set openpool-temporary banip ${ipAddress}`, (err) => err
          ? reject(err)
          : resolve()
        )
      })
    })
  }
}
