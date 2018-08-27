<template>
  <div>
    <br>
    <div v-if="account">
      Address: {{ $route.params.address }}<br>
      Balance: {{ account.balance }}
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
    fetch('http://localhost:1999/accounts/1')
      .then(response => response.json())
      .then(data => (this.account = data))
      .catch(err => console.error(err))
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
