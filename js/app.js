var async = require('async');
var request = require('sync-request');
const client = require('shodan-client');
const util   = require('util');
var allCameras = [];

// create a queue object with concurrency 5
var q = async.queue(function(task, callback) {
    task();
    callback();
}, 5);

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
    q.push(function()
    {
        console.log('Scanning: ' + url);

        try {
            var ipRes = request('HEAD', url, {timeout: 5000, socketTimeout: 5000});
            //console.log(ipRes);

            if (ipRes.headers["content-type"] == "image/jpeg") {
                allCameras.push(url);
                console.log('Saved: ' + url);
            }
        } catch (e) {
            console.log(e);
        }
    }, function(err)
    {
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