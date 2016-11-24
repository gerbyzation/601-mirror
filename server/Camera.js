const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');

/**
 * Camera represents a connection with an mjpeg stream
 * @param {String=} url - url to mjpeg stream
 * @constructor
 */
function Camera(url) {
  this.url = url;

  // initiate connection
  this.connect(url);
  return this;
}

/**
 * Open connection to camera and setup pipes
 * @param {String=} url - url to camera
 */
Camera.prototype.connect = function (url) {
  this.connection = request.get(url);

  function errorCallback (err) {
    if (err.code == 'ETIMEOUT') {
      console.log('### reconnecting');
      this.reconnect();
    }
    console.error('camera', url, err);
  }

  this.connection.on('error', errorCallback)
  this.consumer = new MjpegConsumer();
  this.resizer = new Resizer();
  this.output = new Output();
  
  // setup the pipes
  return this.resizer = this.connection.pipe(this.consumer).pipe(this.resizer).pipe(this.output);
}

Camera.prototype.reconnect = function () {
  this.close();
  this.connect(this.ur);
}

/**
 * Closes the connection to the camera and unpipe streams
 */
Camera.prototype.close = function () {
  this.connection.unpipe(this.consumer);
  this.consumer.unpipe(this.resizer);
  this.resizer.unpipe(this.output);
}

/**
 * Overwrite pipe to .pipe on private var
 * @param dest - stream to attach to
 */
Camera.prototype.pipe = function (dest) {
  return this.output.pipe(dest);
}

/**
 * Overwrite unpipe to run .unpipe on private var
 * @param dest - stream to detach from
 */
Camera.prototype.unpipe = function (dest) {
  return this.output.unpipe(dest);
}

module.exports = Camera;