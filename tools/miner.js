'use strict'

/**
 * This program simulates the behaviour of a stratum compliant miner,
 * except it does not mine and submit jobs.
 *
 * It logs in, requests jobs and sends keepalive.
 * It is useful for testing without having to launch a real miner.
 */

const Network = require('net')
const Socket = Network.Socket

let messageId = 0
let minerId
const socket = new Socket()
socket.setEncoding('utf8')
socket.on('data', onData)

socket.connect(31415, '127.0.0.1', onStartup)

function onData (json) {
  const data = JSON.parse(json)
  if (data.result && data.result.id) {
    minerId = data.result.id
  }
  console.log('minerId', minerId)
  console.log('data', data)
}

function onStartup () {
  console.log(`TCP Connection established to localhost:31415`)
  socket.write(JSON.stringify({ 'id': messageId++, 'method': 'login', 'params': { 'login': 'adaxi', 'pass': 'x', 'agent': 'netcat' } }) + '\n')
  setInterval(() => {
    console.log(`Sending keepalive: ${minerId}`)
    socket.write(JSON.stringify({ 'method': 'keepalived', 'id': messageId++, 'params': { 'id': minerId } }) + '\n')
  }, 30000)
  setInterval(() => {
    console.log(`Requesting job: ${minerId}`)
    socket.write(JSON.stringify({ 'method': 'getjob', 'id': messageId++, 'params': { 'id': minerId } }) + '\n')
  }, 5000)
}
