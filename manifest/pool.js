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
          plugin: require('../src/stratum'),
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
          plugin: require('../src/fail2ban'),
          options
        },
        {
          plugin: require('../src/push-notifications'),
          options
        },
        {
          plugin: require('../src/pool'),
          options
          // @ todo: handle multiple pools
        }
      ]
    }
  }
)
