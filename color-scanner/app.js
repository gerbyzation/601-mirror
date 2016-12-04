const winston = require('winston');
const MjpegCamera = require('mjpeg-camera');

const socket = require('socket.io-client')('http://localhost:8081');
const ColorThief = require('color-thief');

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
    // const camera = new MjpegCamera({
    //   url: item.url
    // });
    socket.emit('update_feed_color', {
      id: item.id,
      color: Math.round(Math.random() * 250)
    });
    // camera.getScreenshot((err, frame) => {
    //   if (err) return logger.error(err);
      
    //   const color = getColor(frame);
    // });
  });
});


/**
 *
 */
function getColor(buffer) {
  logger.debug('buffer', buffer);
  const data = 'data:image/jpeg;base64,' + buffer.toString('base64');
  // const image = new Image();
  // image.src = data;

  // const thief = new ColorThief();
  // const color = thief.getColor(data);
  // logger.debug(color, color[0]/100, color[1]/100, color[2]/100);
  return 125;
}
