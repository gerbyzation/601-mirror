const stream = require('stream');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');
const Camera = require('./Camera');
const Drain = require('./Drain');

function streamRoute (app) {
  const socket = app.get('socket');
  const logger = app.get('logger');

  const pipes = {};

  function init_feed(data) {
    let feed = new Camera(data['url']);
    let id = data['id'];
    pipes[id] = feed;
    logger.info('init feed', 'total feeds', Object.keys(pipes).length);
    socket.emit('feed_active', {
      id
    })
  }

  socket.on('init_feed', (data) => {
    init_feed(data);
  });

  socket.on('swap_feed', (data) => {
    const id = data.currentFeedId;
    const newFeed = data.newFeed;
    init_feed(newFeed, socket);
    setTimeout(500, () => {
      pipes[id].close();
      delete pipes[id];
    });
  })

  app.get('/stream/:index', (req, res) => {
    logger.info('reading stream', req.params.index);
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Pragma': 'no-cache'
    });

    const index = req.params.index;
    let pipe = pipes[req.params.index];

    pipe.pipe(res);

    req.on('close', () => {
      pipe.unpipe(res);
      pipe.close();
      res.send();
    });
  });
}

module.exports = streamRoute;