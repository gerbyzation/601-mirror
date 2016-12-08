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

const logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({level: 'debug'}),
  ]
});

const init = require('./init');

app.set('logger', logger);
app.set('io', io);

// setup database and read feeds from output.json
init(app);
const db = app.get('db');

io.on('connection', (client) => {
  logger.info('a node connected', client.id);

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
    let query = 'UPDATE feeds SET status="' + 'active' + '", node="' + client.id + '" WHERE id="' + id + '"';
    db.run(query, (err, res) => {
      if (err) logger.error('update feed', err);
      if (res) logger.info('feed_active update', res);
    });
  });

  client.on('request_dusty_feeds', () => {
    logger.info('request_dusty_feeds');
    const feeds = db.all(
      `SELECT * FROM feeds WHERE
      status = "inactive" AND
      color_verified IS NULL
      OR color_verified < $fallofftime;`,
      {$fallofftime: Date.now() - 15 * 60 * 1000}, 
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
    logger.debug("update color now", data);
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
      })
    }
    db.run(
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
        if (err) return logger.error('update color err', err)
        else logger.debug('update color res', res);
      }
    );
  });

  client.on('init_streams', () => {
    for (var i = 1; i <= 15; i++){
      let query = 'SELECT * FROM feeds WHERE color=' + i;
      logger.debug('query', query);
      db.get(query, (err, response) => {
          if (err) return logger.error(err);
          if (response !== undefined) {
            logger.debug('init_feed', response);
            client.emit('init_feed', response);
          } else {
            logger.warn('init_feed query returned undefined');
          }
        }
      );
    }
  })

  client.on('image_frame', (data) => {
    db.get('SELECT color FROM feeds WHERE id=$id', {id: data.id}, (err, res) => {
      if (err) return logger.error(err);
      data.color = res.color;
      io.emit('image_frame', data);
    })
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