const Path = require('path')

console.log(Path.join(__dirname, '../src/ui/dist'))

module.exports = (options) => (
  {
    server: {
      port: 1999,
      routes: {
        files: {
          relativeTo: Path.join(__dirname, '../src/ui/dist')
        },
        cors: true
      }
    },
    register: {
      plugins: [
        {
          plugin: require('inert')
        },
        {
          plugin: require('../src/coins'),
          options
        },
        {
          plugin: require('../src/database'),
          options
        },
        {
          plugin: require('../src/model'),
          options
        },
        {
          plugin: require('../src/api'),
          options
        },
        // {
        //   plugin: require('../src/push-notifications'),
        //   options
        // },
        {
          plugin: require('../src/ui'),
          options
        }
      ]
    }
  }
)
