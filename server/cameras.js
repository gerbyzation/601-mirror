var async = require('async');
var request = require('request');
var jimp = require('jimp');
const client = require('shodan-client');
const redis = require('redis');

const r = redis.createClient();

r.on('error', (err) => {
  console.log('Redis Error ' + err);
});

function cameras(app) {
  return app.get('/cameras', function (req, res) {
    console.log('starting');
    var allCameras = [];
    // create a queue object with concurrency 5
    var q = async.queue(function(url, callback) {
      console.log('Scanning: ' + url);

      try {
        request.head({
          url,
          method: "HEAD",
          timeout: 2000,
        }, callback);
      } catch (e) {
          console.log(e);
      }
    }, 10);

    q.drain = function(){
      console.log('all items have been processed');
      return res.json({'cameras': allCameras});
    };

    var processIp = function(url) {
      // First argument = task
      // Second argument = callback
      q.push(url, function (error, response, body) {
        if (response) {
          console.log(response.headers['content-type'], response.headers['content-type'] == 'image/jpeg')
          if (response.headers["content-type"] == "image/jpeg" && response.headers['content-length'] > 0) {

            jimp.read(url, function (err, image) {
              r.sadd('urls', url);
            })
            console.log('Saved: ' + url);
          }
        }
      });
    };

    const searchOpts = {
      // facets: 'port:100,country:100',
      // minify: false,
    };

    client.search('webcamxp', 'zyEqgrpVl4T6zPxajV7q4rxB0vvFKoRm', searchOpts)
    .then(res => {
      //console.log('Result:');
      //console.log(util.inspect(res, { depth: 6 }));
      for (var i = 0; i < res.matches.length; i++) {
        var ipStr = res.matches[i].ip_str;
        var lat = res.matches[i].location.latitude;
        var long = res.matches[i].location.longitude;
        console.log("IP = " + ipStr + ", Latitude = " + lat + ", Longitude = " + long);
        // var j = 1;
        for (var j = 1; j < 4; j++) {
          processIp('http://' + ipStr + ':8080/cam_' + j + '.jpg');
        }
      }

    });
  })
}

module.exports = cameras;