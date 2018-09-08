<template>
  <div class="page-container">
    <md-app md-mode="reveal">
      <md-app-toolbar class="md-primary">
        <md-button class="md-icon-button" @click="menuVisible = !menuVisible">
          <md-icon>menu</md-icon>
        </md-button>
        <span style="flex: 1" class="md-title">Openpool</span>
        <hash-rates style="flex: 11"/>
      </md-app-toolbar>

      <md-app-drawer :md-active.sync="menuVisible">
        <md-toolbar class="md-transparent" md-elevation="0">Openpool</md-toolbar>
        <md-list>
          <md-list-item>
            <md-icon>account_balance</md-icon>
            <span class="md-list-item-text">Account &amp; Payments</span>
          </md-list-item>

          <md-list-item>
            <md-icon>group</md-icon>
            <span class="md-list-item-text">Pool</span>
          </md-list-item>

          <md-list-item>
            <md-icon>help</md-icon>
            <span class="md-list-item-text">Tutorial</span>
          </md-list-item>
        </md-list>
      </md-app-drawer>

      <md-app-content>
        <router-view></router-view>
      </md-app-content>
    </md-app>
  </div>
</template>

<script>
import Vue from 'vue'
import VueMqtt from 'vue-mqtt'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import HashRates from './components/HashRates.vue'

Vue.use(VueMaterial)
Vue.use(VueMqtt, 'ws://localhost:3000/')

export default {
  name: 'App',
  components: {
    HashRates
  },
  data: () => ({
    menuVisible: false
  })
}
</script>

<style lang="scss">

@import "~vue-material/dist/theme/engine"; // Import the theme engine

@include md-register-theme("default", (
  primary: md-get-palette-color(blue, A200), // The primary color of your application
  accent: md-get-palette-color(red, A200), // The accent or secondary color
  theme: dark // This can be dark or light
));

@import "~vue-material/dist/theme/all";

body {
  font-family: 'Rubik', Roboto, sans-serif;
  font-size: 16px;
}

#app {
  font-family: 'Rubik', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  height: 1080px;
}

.md-app {
  border: 1px solid rgba(#000, .12);
}

.md-app-container {
  min-height: 400px;
}

.md-drawer {
  width: 230px;
  max-width: calc(100vw - 125px);
  background-color: white;
}
</style>
