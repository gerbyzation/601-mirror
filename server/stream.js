const stream = require('stream');
const sharp = require('sharp');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Writable = stream.Writable;
const Transform = stream.Transform;



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
      console.error('sharp error', error)
      done();
    });
}

const urls = [
  "http://78.142.74.58:81/mjpg/video.mjpg",
  "http://50.123.219.57:80/mjpg/video.mjpg",
  "http://79.121.108.58:80/mjpg/video.mjpg",
  "http://70.116.159.58:80/mjpg/video.mjpg",
  "http://2.248.119.57:80/mjpg/video.mjpg",
  "http://87.20.84.57:81/mjpg/video.mjpg",
  "http://95.226.17.54:80/mjpg/video.mjpg",
  "http://203.124.37.58:80/mjpg/video.mjpg",
  "http://194.46.230.57:1024/mjpg/video.mjpg",
  "http://132.160.100.57:80/mjpg/video.mjpg",
  "http://166.142.23.57:80/mjpg/video.mjpg",
  "http://188.192.64.58:8080/mjpg/video.mjpg",
  "http://92.220.56.55:80/mjpg/video.mjpg",
  "http://88.190.98.55:81/mjpg/video.mjpg",
  "http://75.42.18.55:8082/mjpg/video.mjpg",
  "http://80.101.186.54:91/mjpg/video.mjpg",
  "http://65.96.34.56:50000/mjpg/video.mjpg",
];

const videostreams = urls.map(url => request.get(url));
var pipes = videostreams.map((_stream, i) => {
  var s = _stream.pipe(stream.PassThrough())
  s.on('readable', () => console.log(i, 'readable', Date.now()));
  // s.on('data', () => console.log(i, 'data', Date.now()))
  return s;
});

// const videostream = request.get('http://166.142.23.50:80/mjpg/video.mjpg')
// const pass = videostream.pipe(stream.PassThrough());

const consumers = pipes.map(() => new MjpegConsumer());
const resizers = pipes.map(() => Resizer());
const outputs = pipes.map(() => Output({}));

module.exports = function (app) {
  app.get('/stream/:index', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Pragma': 'no-cache'
    });

    const index = req.params.index;
    let pipe = pipes[req.params.index];

    pipe
      .pipe(consumers[index])
      .pipe(resizers[index])
      .pipe(outputs[index])
      .pipe(res);

    req.on('close', () => {
      pipe.unpipe(consumers[index]);
      consumers[index].unpipe(resizers[index]);
      resizers[index].unpipe(outputs[index]);
      outputs[index].unpipe(res);
      res.send();
    })
  })
}
