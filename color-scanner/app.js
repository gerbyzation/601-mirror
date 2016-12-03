const logger = require('winston');
const MjpegCamera = require('mjpeg-camera');

const socket = require('socket.io-client')('http://localhost:8081');
const ColorThief = require('color-thief');

let last_check = 0;

socket.on('connect', () => {
  logger.info('connected to master');
});

// while (true) {
//   if (Date.now() - last_check > 60 * 1000) {
//     console.log('requesting dusty feeds');
//     socket.emit('request_dusty_feeds');
//     last_check = Date.now();
//   }
// }
socket.emit('request_dusty_feeds');

socket.on('verify_colors', (data) => {
  console.log('verify_colors socket event');
  console.log(typeof data, data);
  data.map((item) => {
    const camera = new MjpegCamera({
      url: item.url
    });
    camera.getScreenshot((err, frame) => {
      if (err) return logger.error(err);
      
      const color = getColor(frame);
      socket.emit('update_feed_color', {
        id: data.id,
        color: color
      });
    });
  });
});


/**
 *
 */
function getColor(buffer) {
  console.log('buffer', buffer);
  const data = 'data:image/jpeg;base64,' + buffer.toString('base64');
  // const image = new Image();
  // image.src = data;

  const thief = new ColorThief();
  const color = thief.getColor(data);
  console.log(color, color[0]/100, color[1]/100, color[2]/100);
  return color;
}
