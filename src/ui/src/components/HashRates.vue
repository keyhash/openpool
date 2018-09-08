<template>
    <div class="hashrates md-layout md-alignment-center-space-around">
        <div class="md-layout-item">
            <md-avatar class="md-avatar-icon">
              <md-icon>public</md-icon>
            </md-avatar>
            Network: {{ network }}
        </div>
        <div class="md-layout-item">
            <md-avatar class="md-avatar-icon">
              <md-icon>group</md-icon>
            </md-avatar>
            Pool: {{ pool }}
        </div>
        <div class="md-layout-item">
            <md-avatar class="md-avatar-icon">
              <md-icon>person</md-icon>
            </md-avatar>
            You: {{ you }}
        </div>
  </div>
</template>
<style>
.hashrates {
  margin-left: 20px;
}
</style>
<script>
export default {
  name: 'HashRates',
  data () {
    return {
      network: 0,
      pool: 0,
      you: 0
    }
  },
  mqtt: {
    'pool/XMR/statistics' (data) {
      const statistics = JSON.parse(Buffer.from(data).toString('utf8'))
      this.network = statistics.networkHashRate
      this.pool = statistics.poolHashRate
    }
  },
  mounted () {
    this.$mqtt.subscribe('pool/XMR/statistics')
  }
}
</script>
