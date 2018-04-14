module.exports = (options) => (
  {
    server: {
      autoListen: false
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
          plugin: require('../src/payments')
        }
      ]
    }
  }
)
