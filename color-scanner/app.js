const socketio-client = require('socket.io-client');
const logger = require('winston');

const socket = require('socket.io-client')('http://localhost:8081');

socket.on('connect', () => {
  
})