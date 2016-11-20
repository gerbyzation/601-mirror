const stream = require('stream');
const sharp = require('sharp');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Writable = stream.Writable;
const Transform = stream.Transform;

const consumer = new MjpegConsumer();

const lengthRegex = /Content-Length:\s*(\d+)/i;

const soi = new Buffer(2);
const eoi = new Buffer(2);
soi.writeUInt16LE(0xd8ff, 0);
eoi.writeUInt16LE(0xd9ff, 0);

function Output(options) {
  if (!(this instanceof Output)) {
    return new Output(options);
  }

  if (!options) options = {};
  stream.Transform.call(this, options);
}

util.inherits(Output, stream.Transform);

Output.prototype._write = function (chunk, encoding, next) {
  this.push("--myboundary\r\n");
  this.push("Content-Type: image/jpeg\r\n");
  this.push("Content-Length: " + chunk.length + "\r\n");
  this.push("\r\n");
  this.push(chunk);
  this.push("\r\n");
  next();
}

function Resizer(options) {
  if (!(this instanceof Resizer)) {
    return new Resizer(options);
  }

  if (!options) options = {};
  stream.Transform.call(this, options);
}

util.inherits(Resizer, stream.Transform);

Resizer.prototype._transform = function (chunk, enc, done) {
  // console.log('resizer', chunk.length, 'encoding', enc);
  // console.log(chunk)
  sharp(chunk)
    .resize(300)
    .toBuffer()
    .then(data => {
      this.push(data)
      done();
    })
    .catch(error => {
      console.error(error)
      done();
    });
}

module.exports = function (app) {
  app.get('/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Pragma': 'no-cache'
    });

    const resizer = Resizer();
    const output = Output(req, res, {});
    request.get('http://166.142.23.50:80/mjpg/video.mjpg')
      .pipe(consumer)
      .pipe(resizer)
      .pipe(output)
      .pipe(res);
  })
}
