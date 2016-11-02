var express = require('express');
var async = require('async');
var fetch = require('node-fetch');
var request = require('request');
const client = require('shodan-client');
const util   = require('util');
var allCameras = [];

const app = express();

app.use(express.static('public'));
app.set('PORT', 80);

app.get('/cameras', function (req, res) {
    res.json({'cameras': 'hi'});
})

app.listen(3000, function () {
    console.log('App listening on 3000');
});

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
}, 50);

q.drain = function()
{
    console.log('all items have been processed');

    fs = require('fs');
    fs.writeFileSync('allcameras.json', 'jsonCallback(' + JSON.stringify(allCameras) + ')', 'utf-8');
};

var processIp = function(url)
{
    // First argument = task
    // Second argument = callback
    q.push(url, function (error, response, body) {
      if (response) {
        if (response.headers["content-type"] == "image/jpeg") {
          // console.dir(response.headers);
          allCameras.push(url);
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

    for (var i = 0; i < 20; i++) {

        var ipStr = res.matches[i].ip_str;
        var lat = res.matches[i].location.latitude;
        var long = res.matches[i].location.longitude;
        console.log("IP = " + ipStr + ", Latitude = " + lat + ", Longitude = " + long);

        processIp('http://' + ipStr + ':8080/cam_1.jpg');

      }
  });