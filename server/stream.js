const stream = require('stream');
const util = require('util');
const request = require('request');
const MjpegConsumer = require('mjpeg-consumer');

const Resizer = require('./Resizer');
const Output = require('./Output');
const Camera = require('./Camera');

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

// const streams = urls.map(url => new Camera(url));
const pipes = [];
for (let i = 0; i < urls.length; i++) {
  let s = new Camera(urls[i]);
  pipes[i] = s;
  s.output.on('readable', () => console.log(i, 'readable', Date.now()));
}

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

    pipe.pipe(res);

    req.on('close', () => {
      pipe.unpipe(res);
      pipe.close();
      res.send();
    })
  })
}
