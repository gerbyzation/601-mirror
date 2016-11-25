const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');
const Channel = require('./Channel');

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
Camera.prototype.connect = function (url, name) {
  this.connection = request.get(url);
  this.name = name;

  function errorCallback (err) {
    if (err.code == 'ETIMEOUT') {
      console.log('### reconnecting');
      this.reconnect();
    }
    console.error('camera', url, err);
  }

  // this.connection.on('error', errorCallback)
  // this.connecton.on('abort', console.log)
  this.consumer = new MjpegConsumer();
  this.resizer = new Resizer();
  this.output = new Output();
  this.channel = new Channel(this.name);
  
  // setup the pipes
  return this.connection
    .pipe(this.consumer)
    .pipe(this.resizer)
    .pipe(this.output)
    .pipe(this.channel);
}

Camera.prototype.reconnect = function () {
  this.close();
  this.connect(this.url);
}

/**
 * Closes the connection to the camera and unpipe streams
 */
Camera.prototype.close = function () {
  this.resizer.unpipe(this.output);
  this.consumer.unpipe(this.resizer);
  // this.connection.unpipe(this.consumer);
}

/**
 * Overwrite pipe to .pipe on private var
 * @param dest - stream to attach to
 */
Camera.prototype.pipe = function (dest) {
  return this.channel.set(dest);
}

/**
 * Overwrite unpipe to run .unpipe on private var
 * @param dest - stream to detach from
 */
Camera.prototype.unpipe = function (dest) {
  return this.channel.unpipe(dest);
}

module.exports = Camera;