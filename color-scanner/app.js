const winston = require('winston');
const MjpegCamera = require('mjpeg-camera');
const getColors = require('get-image-colors');
const async = require('async');

const socket = require('socket.io-client')('http://localhost:8081');

const logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({level: 'debug'})
  ]
});

let last_check = 0;

socket.on('connect', () => {
  logger.info('connected to master');
  check();
});

function check() {
  if (Date.now() - last_check > 60 * 1000) {
    logger.debug('requesting dusty feeds');
    socket.emit('request_dusty_feeds');
    last_check = Date.now();
  }
  setTimeout(check, 1000);
}
// socket.emit('request_dusty_feeds');

socket.on('verify_colors', (data) => {
  logger.debug('verify_colors socket event', data.length);
  data.map((item) => {
    queue.push(item, (err, start) => {
      if (err) logger.error('get frame error', err);
      logger.debug('took', Date.now() - start, 'ms');
    });
  });
});

const queue = async.queue((item, done) => {
  const alert = setTimeout(() => {
    logger.warn('Worker taking too long to complete');
  }, 20 * 1000);

  const start = Date.now();
  const camera = new MjpegCamera({
    url: item.url,
    timeout: 10000
  });
  camera.getScreenshot((err, frame) => {
    if (err) {
      clearTimeout(alert);
      return done(err);
    }
    
    getColors(frame, 'image/jpg', (err, colors) => {
      if (err) {
        clearTimeout(alert);
        return done(err);
      }
      const grey = Math.floor(colors[0].rgb().reduce((a, b) => a + b) / 6);
      logger.debug('grey value', grey);
      socket.emit('update_feed_color', {
        id: item.id,
        color: grey,
      });
      clearTimeout(alert);
      done(null, start);
    });
  });
}, 25);