var async = require('async');
var request = require('request');
var jimp = require('jimp');
const client = require('shodan-client');
const redis = require('redis');
var util = require('util');
const winston = require('winston');
var cheerio = require('cheerio');

const r = redis.createClient();

r.on('error', (err) => {
  if (err.code == 'ECONNREFUSED') {
    winston.error('Failed to connect to redis. Verify redis is running')
    return process.exit(1);
  }
  winston.error('Redis Error: ' + err);
});

function cameras(app) {
  return app.get('/cameras', function (req, res) {
    console.log('starting');
    // Start with the first page of results.
    searchCameras(1);

    // create a queue object with concurrency 10
    const q = async.queue(function(url, callback) {
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
        console.log('Queue empty');
        return res.send('Finished');
    };

    function processIp (url) {
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

    var urlsToCheck = [];

    function searchCameras (page) {
      var searchOpts = {
        page: page,
        timeout: 5000
      };

      console.log('Processing page: ' + page);

      client.search('webcamxp', 'zyEqgrpVl4T6zPxajV7q4rxB0vvFKoRm', searchOpts)
      .then(res => {
        //console.log('Result:');
        // console.log(util.inspect(res, { depth: 6 }));
        for (var i = 0; i < res.matches.length; i++) {
          var ipStr = res.matches[i].ip_str;
          // var lat = res.matches[i].location.latitude;
          // var long = res.matches[i].location.longitude;
          // console.log("IP = " + ipStr + ", Latitude = " + lat + ", Longitude = " + long);
          // var j = 1;
          for (var j = 1; j < 4; j++) {
            var url = 'http://' + ipStr + ':8080/cam_' + j + '.jpg';
            // processIp(url);
            urlsToCheck.push(url);
          }
        }

        // Try the next page if there is one.
        var pages = Math.ceil(res.total / 100);

        // There is another page.
        if(page < 6) {
          searchCameras(page + 1);
        }
        // Already on the last page, so process URLs.
        else {
          for(var i = 0; i < urlsToCheck.length; i++) {
            var url = urlsToCheck[i];
            processIp(url);
          }
        }
      })
      .catch(function(e) {
        // There was an error - probably a timeout, so try again in a second.
        console.log('Error - trying again...', e);

        setTimeout(function() {
            searchCameras(page);
        }, 1000);
      });

    };
  })
}

module.exports = cameras;