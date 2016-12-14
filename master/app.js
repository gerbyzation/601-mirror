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
const maxFeedsPerNode = process.env.FEEDS || 10;

const app = express();

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

const init = require('./init');

app.set('logger', logger);
app.set('io', io);
app.use(express.static("../public"));

// setup database and read feeds from output.json
init(app);
const db = app.get('db');

app.use(cors());

var check;
function checkFeeds() {
  logger.info('################################ check feeds');
  check = setTimeout(() => {
    db.all('SELECT * FROM feeds WHERE status="active";', (err, res) => {
      debugger;
      const colors = res.map(feed => feed.color);
      const colorsAvailable = [];
      for (let i = 0; i < 128; i++) {
        if (!colors.includes(i)) colorsAvailable.push(i);
      }
      logger.info('active colors', colors.length);
      logger.info('availalbe colors', colorsAvailable.length);
      var initiated = 0;
      if (colorsAvailable.length > 0) {
        db.all('SELECT * FROM nodes', (err, res) => {
          res.map(node => {
            let query = `SELECT * FROM feeds WHERE node='` + node.id + `'`;
            db.all(query, (err, res) => {
              if (colorsAvailable.length > 0 && (res.length < maxFeedsPerNode)) {
                // logger.info('found', res.length, 'feeds for node');
                // if (res.length < maxFeedsPerNode) {
                  let nNewFeeds = Math.min(maxFeedsPerNode - res.length, colorsAvailable.length)
                  logger.info('current', res.length, 'max', maxFeedsPerNode, 'space', nNewFeeds);
                  if (nNewFeeds > 0) {
                    for (let i = 0; i < nNewFeeds; i++) {
                      let randomIndex = Math.floor(Math.random() * colorsAvailable.length);
                      let color = colorsAvailable[randomIndex];
                      colorsAvailable.splice(randomIndex, 1);
                      logger.info('node id', node.id);
                      init_feed(node.id, color);
                      initiated++;
                    }
                  }
                // }
              }
            })
          })
        })    
      }
      logger.info('initiated', initiated, 'feeds')
    })
    checkFeeds();
  }, 10000);
}

io.on('connection', (client) => {
  client.emit('id', client.id);
  logger.info('a node connected', client.id);

  client.on('register_as_proxy', () => {
    db.run(
      'INSERT INTO nodes VALUES ($node);',
      {$node: client.id},
      (err, res) => { if (err) logger.error('add node', err) }
    );

    if (check == null) {
      checkFeeds();
    }  
  });

  client.on('feed_active', (data) => {
    logger.debug('client.on feed_active', data);
    let id = data.id;
    let query = 'UPDATE feeds SET status="' + 'active' + '", node="' + client.id + '" WHERE id="' + id + '"';
    db.run(query, (err, res) => {
      if (err) return logger.error('update feed', err);
      if (res) return logger.info('feed_active update', res)
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
    // logger.debug("update color now", data);
    if (data.active) {
      db.serialize(() => {
        db.get(
          'SELECT * FROM feeds WHERE id=$id',
          {$id: data.id}, 
          (err, res) => {
            if (err) return logger.error(err);
            // check for difference in color
            if (res !== undefined) {
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
      }
    );
  });

  client.on('init_streams', () => {
    for (var i = 30; i <= 120; i += 3){
      init_feed(client.id, i);
    }
  })

  client.on('image_frame', (data) => {
    let query = `SELECT * FROM feeds WHERE id="` + data.id + `";`;
    db.get(query, (err, res) => {
      if (err) return logger.error(err);
      if (res === undefined) return;
      data.color = res.color;
      io.emit('image_frame', data);
    })
  });

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
    let query = `UPDATE feeds SET status='inactive', node=NULL WHERE node='` + client.id + `';`
    db.run(query, (err, res) => {
      if (err) logger.error(err)
    });
    query = `DELETE FROM nodes WHERE id='` + client.id + `';`;
    db.run(query, (err, res) => {
      if (err) logger.error(err);
    })
  });

  client.on('test_request', () => {
    db.get('UPDATE feeds SET status="inactive", node=NULL WHERE status="inactive"', (err, res) => {
      if (err) return logger.error(err);
      io.emit('test_response');
      logger.info('########################################### TEST RESPONSE')
    })
  })
});

function swap_feed(currentFeedId, color, client) {
  logger.info('##### swapping feeds');
  // 1. find new feed with right color
  db.get(
    'SELECT * FROM feeds WHERE color=$color AND status="inactive" OR status=NULL',
    {$color: color},
    (err, res) => {
      if (err) return logger.error(err);
      // 2. send swap event to client
      client.emit('swap_feed', {currentFeed: currentFeedId, newFeed: res});

      let query = `UPDATE feeds SET status="inactive", node=NULL WHERE id='` + currentFeedId + `';`
      logger.debug('deactivating', currentFeedId, 'activating', res);
      db.run(query, (err) => {
        if (err) return logger.error('failed to mark feed as inactive on swap', query , err);
      });
      
    }
  )
}

function init_feed(host, color) {
  let query = 'SELECT * FROM feeds WHERE color=' + color + ' AND status="inactive" OR status IS NULL;';
  // logger.debug('query', query);
  logger.debug('INIT FEED FUNCTION CALL');
  db.get(query, (err, response) => {
      if (err) return logger.error(err);
      if (response !== undefined) {
        let payload =  Object.assign({}, response, {node: host})
        logger.debug('io.emit init_feed', payload);
        io.emit('init_feed', payload);
      } else {
        logger.warn('init_feed query returned undefined', query);
      }
    }
    );
}

require('./routes')(app);

server.listen(app.get('PORT'), () => {
  logger.info('master server listening on', app.get("PORT"));
});
