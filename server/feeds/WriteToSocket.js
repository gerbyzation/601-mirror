/**
 * Write image over websockets
 */

const stream = require('stream');
const util = require('util');
const getColors = require('get-image-colors');
const logger = require('winston');

function WriteToSocket(socket, id, options) {
  if (!(this instanceof WriteToSocket)) {
    return new WriteToSocket(options);
  }

  this.socket = socket;
  this.id = id;
  this.last_check = 0;

  if (!options) options = {};
  stream.Writable.call(this, options);
}

util.inherits(WriteToSocket, stream.Writable);

WriteToSocket.prototype._write = function (chunk, encoding, next) {
  if (this.last_check < Date.now() - 60 * 1000) {
    getColors(chunk, 'image/jpg', (err, colors) => {
      if (err) console.error(err)
      else {
        const color = Math.floor(colors[0].rgb().reduce((a, b) => a + b) / 6);
        console.log('color value', color);
        this.socket.emit('update_feed_color', {
          id: this.id,
          color: color,
        });
        this.last_check = Date.now();
      }
    });
  }
  this.socket.emit('image_frame', {
    id: this.id,
    frame: chunk
  })
  next();
}

module.exports = WriteToSocket;