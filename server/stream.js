const stream = require('stream');
const sharp = require('sharp');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('./consumer');

const Writable = stream.Writable;
const Transform = stream.Transform;

const consumer = new MjpegConsumer();

const lengthRegex = /Content-Length:\s*(\d+)/i;

const soi = new Buffer(2);
const eoi = new Buffer(2);
soi.writeUInt16LE(0xd8ff, 0);
eoi.writeUInt16LE(0xd9ff, 0);


function Consumer(options) {
  if (!(this instanceof Consumer)) {
    return new Consumer(options);
  }

  stream.Transform.call(this, options);
}

Consumer.prototype._transform = function (chunk, encoding, done) {
  var start = chunk.indexOf(soi);
  var end = chunk.indexOf(eoi);
  var len = (lengthRegex.exec(chunk.toString('ascii')) || [])[1];

  // if (this.buffer && (this.reading || start > 1)) {
  //   // thi
  // }
  // console.log('consumer', chunk, encoding);
  this.push(chunk);
}


function Output(req, res, options) {
  if (!(this instanceof Output)) {
    return new Output(req, res, options);
  }

  if (!options) options = {};
  stream.Writable.call(this, options);
  this.req = req;
  this.res = res;
}

util.inherits(Output, stream.Writable);

Output.prototype._write = function (chunk, encoding, next) {
  // console.log('output', chunk.length, encoding);
  this.res.write("--myboundary\r\n");
  this.res.write("Content-Type: image/jpeg\r\n");
  this.res.write("Content-Length: " + chunk.length + "\r\n");
  this.res.write("\r\n");
  this.res.write(chunk, 'binary');
  this.res.write("\r\n");
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
  var start = Date.now();
  sharp(chunk)
    .resize(300)
    .toBuffer()
    .then(data => {
      this.push(data)
      done();
    });
  var end = Date.now();
  console.log('took', Date.now() - start, '(' + start + ',' + end + ')');
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
    // const resizer = sharp().resize(300).toBuffer();
    const output = Output(req, res, {});
    request.get('http://166.142.23.50:80/mjpg/video.mjpg')
      .pipe(consumer)
      .pipe(resizer)
      .pipe(output);
  })
}
