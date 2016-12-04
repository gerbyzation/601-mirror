const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const winston = require('winston');
const expressWinston = require('express-winston');
const consoleFormatter = require('winston-console-formatter');
const sqlite3 = require('sqlite3');
const uuid = require('node-uuid');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const app = express();
const server = http.Server(app);
const io = socketio(server)
const db = new sqlite3.Database('./stuff.db');
const logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({level: 'debug'}),
  ]
});

const init = require('./init');

app.set('db', db);
app.set('logger', logger);
app.set('io', io);

// setup database and read feeds from output.json
init(app);

io.on('connection', (client) => {
  client.use(function(packet, next){
    logger.debug('received packet');
    next();
  });

  logger.info('a node connected', client.id);
  db.run('INSERT INTO nodes VALUES ($node);',{$node: client.id}, (err, res) => { if (err) logger.error('add node', err) })

  client.emit('init_feed', {
    id: 123,
    url: "http://70.116.159.58:80/mjpg/video.mjpg"
  });

  client.on('feed_active', (data) => {
    logger.debug('feed_active', data);
    let id = data.id;
    db.run('UPDATE feeds SET status=$status, node=$node WHERE id=$id;', {
      $status: 'active',
      $node: client.id,
      $id: id
    }, (err, res) => {
      if (err) logger.error('update feed', err);
    })
  });

  client.on('request_dusty_feeds', () => {
    logger.info('request_dusty_feeds');
    const feeds = db.all('SELECT * FROM feeds WHERE status = "inactive" AND color_verified IS NULL;', (err, res) => {
      if (err) logger.error('query dusty feeds', err)
      else {
        if (res.length > 0) {
          logger.info('sending verify_colors', res.length);
          client.emit('verify_colors', res);
        } else {
          logger.debug('no feeds to verify');
        }
      }
    })
  })

  client.on('update_feed_color', (data) => {
    logger.debug("update color", data);
    db.run('UPDATE feeds SET color=$color, color_verified=$color_verified WHERE id=$id;', {
      $color: data.color,
      $color_verified: Date.now(),
      $id: data.id
    }, (err, res) => {
      if (err) logger.error('update color err', err)
      else logger.debug('update color res', res);
    })
  })

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
  });
});

require('./routes')(app);

server.listen(8081, () => {
  logger.info('master server listening on 8081');
});