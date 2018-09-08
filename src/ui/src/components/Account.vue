<template>
  <div>
    <br>
    <div v-if="account">
      Address: {{ $route.params.address }} <br>
      Balance: {{ account.balance }} {{ account.coinCode }} <br>
      Account created at {{ account.createdAt }} <br>
      Last update at {{ account.updatedAt }} <br>
      Submitted hashes: {{ account.hashes }} <br>
      Valid shares: {{ account.valid }} <br>
      Invalid shares: {{ account.invalid }} <br>
    </div>
    <div v-else>
      Account not found
    </div>
  </div>
</template>

<script>
export default {
  name: 'Account',
  data () {
    return {
      account: null
    }
  },
  mounted () {
    const address = this.$route.params.address
    const url = `http://localhost:1999/accounts/${encodeURIComponent(address)}`
    fetch(url)
      .then(response => response.json())
      .then(data => (this.account = data))
      .catch(err => console.error(err))
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
