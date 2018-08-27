'use strict'

exports.plugin = {
  pkg: require('./package.json'),
  register: async function (server, options) {
    server.route({
      method: 'GET',
      path: '/{param*}',
      config: {
        auth: false,
        cache: {
          expiresIn: 24 * 60 * 60 * 1000,
          privacy: 'public'
        }
      },
      handler: {
        directory: {
          path: '.',
          redirectToSlash: true,
          listing: false,
          index: true
        }
      }
    })
  }
}
