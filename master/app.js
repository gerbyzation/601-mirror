const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const logger = require('winston');
const expressWinston = require('express-winston');

const app = express();
const server = http.Server(app);
const io = socketio(server)

const nodes = {}

const feeds = {}

io.on('connection', (client) => {
  logger.info('a node connected', client.id);
  nodes[client.id] = client;

  client.emit('init_feed', {
    id: 123,
    url: "http://70.116.159.58:80/mjpg/video.mjpg"
  });

  client.on('feed_active', (data) => {
    let id = data.id;
    feeds[id] = Object.assign({}, feeds[id], {
      status: 'active',
      node: client.id
    });
  });

  client.on('disconnect', () => {
    logger.info('node disconnected', client.id);
  });
});

function add_feed(url, id) {
  feeds[id] = {
    url,
    status: 'inactive'
  }

  io.emit('init_feed', Object.assign({}, feeds[id], {id}));
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
    let id = Object.keys(feeds).length;
    add_feed(item, id);
  })
  res.send();
});

app.get('/status', (req, res) => {
  res.json(feeds);
});

server.listen(8081, () => {
  logger.info('master server listening on 8081');
});