const express = require('express');
const async = require('async');
const http = require('http');

const util   = require('util');
const winston = require('winston');
const expressWinston = require('express-winston');

const client = require('socket.io-client')('http://139.59.168.137:8081');
const socketio = require('socket.io');
const opbeat = require('opbeat').start({
  appId: '7175bcb323',
  organizationId: '2c89e2d518d64f2e8e4e3b0c5f7ba81a',
  secretToken: '8f12e915bc2d491417df256336ce3a4dbd4d50ee'
})

const app = express();
const server = http.Server(app);
// const socket = socketio(server)

app.use(opbeat.middleware.express());
app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    })
  ]
}));

app.use(express.static('../public'));
app.set('PORT', 80);
// app.set('socket', socket);
app.set('client', client);
app.set('logger', winston);

// Register API endpoints
// require('./cameras')(app);
// require('./feeds')(app);

server.listen(3000, function () {
    winston.info('App listening on 3000');
});

