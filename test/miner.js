'use strict'

const Network = require('net')
const Socket = Network.Socket

let id
const socket = new Socket()
socket.setEncoding('utf8')
socket.on('data', onData)

socket.connect(31415, '127.0.0.1', onStartup)

function onData (data) {
  const result = JSON.parse(data)
  if (result.id) {
    id = result.id
  }
  console.log('data', data)
}

function onStartup () {
  console.log(`TCP Connection established to localhost:31415`)
  socket.write(JSON.stringify({ 'method': 'login', 'params': { 'login': 'adaxi', 'pass': 'x', 'agent': 'netcat' } }) + '\n')
  setInterval(() => {
    console.log(`Sending keepalive: ${id}`)
    socket.write(JSON.stringify({ 'method': 'keepalived', 'id': id }) + '\n')
  }, 30000)
  setInterval(() => {
    console.log(`Requesting job: ${id}`)
    socket.write(JSON.stringify({ 'method': 'getjob', 'id': id }) + '\n')
  }, 5000)
}
