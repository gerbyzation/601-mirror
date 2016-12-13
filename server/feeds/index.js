const stream = require('stream');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');
const Camera = require('./Camera');
const Drain = require('./Drain');

function streamRoute (app) {
  const socket = app.get('client');
  // const socket = app.get('socket');
  const logger = app.get('logger');

  const pipes = {};

  function init_feed(data) {
    if (data === undefined) return logger.warn('init feed received undefined');
    console.log('url', data)
    let id = data['id'];
    let feed = new Camera(data['url'], socket, id);
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
    init_feed(newFeed);
    setTimeout(() => {
      // pipes[id].close();
      delete pipes[id];
    }, 500);
  })

  app.get('/start_streams', (req, res) => {
    socket.emit('init_streams');
    res.send();
    // logger.info('reading stream', req.params.index);
    // res.writeHead(200, {
    //   'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary',
    //   'Cache-Control': 'no-cache',
    //   'Connection': 'close',
    //   'Pragma': 'no-cache'
    // });

    // const index = req.params.index;
    // let pipe = pipes[req.params.index];

    // pipe.pipe(res);

    // req.on('close', () => {
    //   pipe.unpipe(res);
    //   pipe.close();
    //   res.send();
    // });
  });

  app.get('/test', (req, res) => {
    socket.emit('test_request');
    console.log('################################### TEST REQUEST');
    res.send();
  })
}

module.exports = streamRoute;