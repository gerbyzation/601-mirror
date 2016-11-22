var async = require('async');
var request = require('request');
var jimp = require('jimp');
const client = require('shodan-client');
const redis = require('redis');
var util = require('util');
var cheerio = require('cheerio');
var fs = require('fs');
var allCameras = [ ];

const r = redis.createClient();

r.on('error', (err) => {
  console.log('Redis Error ' + err);
});

function scrapedCameras(app) {  
  return app.get('/scrape', function (req, res) {
    console.log('scraping cameras');

    // create a queue object with concurrency 10
    const q = async.queue(function (url, callback) {
      console.log('Scanning: ' + url);

      try {

        request(url, function (error, response, html) {
            if(!error) {
                var $ = cheerio.load(html);

                var imageSource;
                
                $('.row.thumbnail-items a.thumbnail-item__wrap .thumbnail-item__preview img.thumbnail-item__img').filter(function() {
                    imageSource = $(this).attr('src');
                    var editedImgSource = imageSource.replace("?COUNTER", "");
                    allCameras.push(editedImgSource);
                });

            } else {
                console.log(error);
            }

            callback();
        });

      } catch (e) {
          console.log(e);
          callback();
      }
    }, 10);

    q.drain = function() {
        console.log('Queue empty');

        fs.writeFile('output.json', JSON.stringify(allCameras, null, 4), function(err) {
            console.log('File successfully written! - Check your project directory for the output.json file');
        });

        return res.send('Finished');
    };

    // Loop through 1130 pages of Axis webcams
    for (var i=1; i <= 1130; i++) { 

        url = 'http://www.insecam.org/en/bytype/axis/' + "?page=" + i; // page 1 to 1130
        q.push(url);

    }    

    /* Loop through 112 pages of http://www.opentopia.com/ webcams

    for (var i=1; i <= 112; i++) { 

        url = 'http://www.opentopia.com/hiddencam.php?showmode=standard&country=%2A&seewhat=highlyrated&p=' + i; // page 1 to 112

        request(url, function(error, response, html) {
            if(!error){
                var $ = cheerio.load(html);

                var imageSource;
                
                $('.boxcontent ul.camgrid.camgrid3 li a img').filter(function() {
                    imageSource = $(this).attr('src');
                    var editedImgSource = imageSource.replace("medium", "big");
                    allCameras.push(editedImgSource);
                })
            }
            
            // res.send('Check your console!') 

        });
    }

    */

  })
}

module.exports = scrapedCameras;