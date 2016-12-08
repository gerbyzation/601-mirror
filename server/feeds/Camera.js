const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');
const Channel = require('./Channel');
const WriteToSocket = require('./WriteToSocket');

/**
 * Camera represents a connection with an mjpeg stream
 * @param {String=} url - url to mjpeg stream
 * @constructor
 */
function Camera(url, socket, id) {
  this.url = url;
  this.id = id;
  this.socket = socket;

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
    if (err.code == 'ETIMEDOUT') {
      console.log('### reconnecting');
      this.reconnect();
    }
  }

  this.connection.on('error', errorCallback.bind(this))
  this.consumer = new MjpegConsumer();
  this.resizer = new Resizer();
  this.output = new Output();
  this.channel = new Channel(this.id);
  this.toSocket = new WriteToSocket(this.socket, this.id);
  
  // setup the pipes
  return this.connection
    .pipe(this.consumer)
    .pipe(this.resizer)
    .pipe(this.toSocket);
    // .pipe(this.output)
    // .pipe(this.channel);
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
  this.resizer.unpipe(this.toSocket);
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