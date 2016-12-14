const express = require('express');
const async = require('async');
const http = require('http');

const util   = require('util');
const winston = require('winston');
const expressWinston = require('express-winston');

const env = process.env.NODE_ENV || 'debug';

var client;
if (env === 'production') client = require('socket.io-client')('https://gerbyzation.nl')
else client = require('socket.io-client')('http://localhost:8081')

const socketio = require('socket.io');
const opbeat = require('opbeat').start({
  appId: '7175bcb323',
  organizationId: '2c89e2d518d64f2e8e4e3b0c5f7ba81a',
  secretToken: '8f12e915bc2d491417df256336ce3a4dbd4d50ee'
})

const app = express();
const server = http.Server(app);

if (env == 'production') app.set('PORT', 80)
else app.set('PORT', 3000);

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

// app.set('socket', socket);
app.set('client', client);
app.set('logger', winston);

// Register API endpoints
// require('./cameras')(app);
require('./feeds')(app);

server.listen(app.get('PORT'), function () {
    winston.info('App listening on', app.get("PORT"));
});

