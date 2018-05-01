module.exports = (options) => (
  {
    server: {
      port: 1998
    },
    register: {
      plugins: [
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
          plugin: require('../src/api-admin'),
          options
        }
      ]
    }
  }
)
