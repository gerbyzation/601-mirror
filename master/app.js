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
  logger.info('a node connected', client.id);

  client.use(function(packet, next){
    logger.debug('received packet');
    next();
  });

  db.run(
    'INSERT INTO nodes VALUES ($node);',
    {$node: client.id},
    (err, res) => { if (err) logger.error('add node', err) }
  );

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
    });
  });

  client.on('request_dusty_feeds', () => {
    logger.info('request_dusty_feeds');
    const feeds = db.all(
      `SELECT * FROM feeds WHERE
      status = "inactive" AND
      color_verified IS NULL
      OR color_verified < $fallofftime;`,
      {$fallofftime: Date.now() - 5 * 60 * 1000}, 
      (err, res) => {
        if (err) logger.error('query dusty feeds', err)
        else {
          if (res.length > 0) {
            logger.info('sending verify_colors', res.length);
            client.emit('verify_colors', res);
          } else {
            logger.debug('no feeds to verify');
          }
        }
      }
    );
  });

  client.on('update_feed_color', (data) => {
    logger.debug("update color", data);
    if (data.active) {
      db.serialize(() => {
        db.get(
          'SELECT * FROM feeds WHERE id=$id',
          {$id: data.id}, 
          (err, res) => {
            if (err) return logger.error(err);
            // check for difference in color
            if (res.color !== data.color) {
              swap_feed(data.id, color, client);
            };
          }
        )
        update();
      })
    }
    update = () => db.run(
      `UPDATE feeds SET
      color=$color,
      color_verified=$color_verified
      WHERE id=$id;`, 
      {
        $color: data.color,
        $color_verified: Date.now(),
        $id: data.id
      },
      (err, res) => {
        if (err) logger.error('update color err', err)
        else logger.debug('update color res', res);
      }
    );
  });

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
  });
});

function swap_feed(currentFeedId, color, client) {
  // 1. find new feed with right color
  db.get(
    'SELECT * FROM feeds WHERE color=$color',
    {$color: color},
    (err, res) => {
      if (err) return logger.error(err);
      // 2. send swap event to client
      client.emit('swap_feed', {currentFeed: currentFeedId, newFeed: res});
    }
  )
}

require('./routes')(app);

server.listen(8081, () => {
  logger.info('master server listening on 8081');
});