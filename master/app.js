const express = require('express');
const https = require('https');
const http = require('http');
const socketio = require('socket.io');
const logger = require('./winston');
const expressWinston = require('express-winston');
const consoleFormatter = require('winston-console-formatter');
const sqlite3 = require('sqlite3');
const uuid = require('node-uuid');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const cors = require('cors');

const env = process.env.NODE_ENV || 'debug';

const app = express();

console.log('still going');

if (env == 'production') {
  const options = {};
  options.key =  fs.readFileSync('/etc/letsencrypt/live/gerbyzation.nl/privkey.pem');
  options.cert = fs.readFileSync('/etc/letsencrypt/live/gerbyzation.nl/cert.pem');
  var server = https.createServer(options, app);
} else {
  var server = http.createServer(app);
}
const io = socketio(server)

if (env == 'production') app.set('PORT', 443)
else app.set('PORT', 8081);

// const logger = new winston.Logger({
//   transports: [
//     new (winston.transports.Console)({level: 'debug'}),
//   ]
// });

// const logger = new winston.Logger();

const init = require('./init');

app.set('logger', logger);
app.set('io', io);
app.use(express.static("../public"));

// setup database and read feeds from output.json
init(app);
const db = app.get('db');

app.use(cors());

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
            if (res !== undefined) {
              console.log('color check', res.color !== data.color);
              if (res.color !== data.color) {
                logger.info('swapping feeds', data.id);
                swap_feed(data.id, res.color, client);
              };
            }
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
    for (var i = 30; i <= 120; i += 3){
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
    let query = `SELECT * FROM feeds WHERE id="` + data.id + `";`;
    db.get(query, (err, res) => {
      if (err) return console.error(err);
      if (res === undefined) return;
      data.color = res.color;
      io.emit('image_frame', data);
    })
  });

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
    let query = `UPDATE feeds SET status='inactive' WHERE node='` + client.id + `';`
    db.run(query, (err, res) => {
      if (err) logger.error(err)
    });
    query = `DELETE FROM nodes WHERE id='` + client.id + `';`;
    db.run(query, (err, res) => {
      if (err) logger.error(err);
    })
  });

  client.on('test_request', () => {
    db.get('UPDATE feeds SET status="inactive" WHERE status="inactive"', (err, res) => {
      if (err) return logger.error(err);
      io.emit('test_response');
      console.log('########################################### TEST RESPONSE')
    })
  })
});

function swap_feed(currentFeedId, color, client) {
  console.log('##### swapping feeds');
  // 1. find new feed with right color
  db.get(
    'SELECT * FROM feeds WHERE color=$color',
    {$color: color},
    (err, res) => {
      if (err) return logger.error(err);
      // 2. send swap event to client
      client.emit('swap_feed', {currentFeed: currentFeedId, newFeed: res});
      let query = `UPDATE feeds SET status="inactive" WHERE id='` + currentFeedId + `';`
      db.run(query, (err) => {
        if (err) return logger.error('failed to mark feed as inactive on swap', query , err);
      })
    }
  )
}

require('./routes')(app);

server.listen(app.get('PORT'), () => {
  logger.info('master server listening on', app.get("PORT"));
});
