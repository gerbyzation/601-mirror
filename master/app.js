const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const winston = require('winston');
const expressWinston = require('express-winston');
const consoleFormatter = require('winston-console-formatter');
const sqlite3 = require('sqlite3');
const uuid = require('node-uuid');

const app = express();
const server = http.Server(app);
const io = socketio(server)
const db = new sqlite3.Database(':memory:');
const logger = new winston.Logger().add(winston.transports.Console, consoleFormatter.config());

// setup database
db.run('DROP TABLE IF EXISTS feeds;', (err, res) => { if (err) logger.error('drop table', err) });
db.run('DROP TABLE IF EXISTS nodes;', (err, res) => { if (err) logger.error('drop table', err) });
db.run('CREATE TABLE feeds (id VARCHAR(100) PRIMARY KEY NOT NULL, status TEXT NOT NULL, node TEXT, url VARCHAR(255) NOT NULL UNIQUE);', (err, res) => { if (err) logger.error('create feeds table', err) });
db.run('CREATE TABLE nodes (id TEXT PRIMARY KEY NOT NULL);', (err, res) => { if (err) logger.error('create nodes table', err) });

io.on('connection', (client) => {
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

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
  });
});

function add_feed(url, id) {
  db.run('INSERT INTO feeds (id, status, url) VALUES ($id, $status, $url);', {
    $id: id,
    $status: 'inactive', 
    $url: url
  }, (err, res) => {
    if (err) logger.error('insert feed', err);
  })
  db.get('SELECT * FROM feeds WHERE id=$id;', {$id: id}, (err, res) => {
    if (err) logger.error('get feed', err)
    else io.emit('init_feed', res);
    console.dir(res);
  });
}

app.get('/start', (req, res) => {
  logger.info('start feeds');
  const _feeds = [
    "http://87.13.38.83:83/mjpg/video.mjpg",
    "http://93.149.227.84:81/mjpg/video.mjpg",
    "http://87.13.38.83:81/mjpg/video.mjpg",
    "http://86.87.59.85:81/mjpg/video.mjpg",
    "http://81.149.241.84:80/mjpg/video.mjpg",
    "http://87.4.208.84:8083/mjpg/video.mjpg",
    "http://187.152.63.82:80/mjpg/video.mjpg",
    "http://166.140.213.81:8080/mjpg/video.mjpg",
    "http://178.239.103.81:8001/mjpg/video.mjpg"
  ];
  _feeds.map((item, index) => {
    let id = uuid.v4();
    add_feed(item, id);
  })
  res.send();
});

app.get('/status', (req, res) => {
  db.all('SELECT * FROM feeds', (err, data) => {
    if (err) logger.error('select all feeds', err);
    res.json(data);
  });
});

server.listen(8081, () => {
  logger.info('master server listening on 8081');
});