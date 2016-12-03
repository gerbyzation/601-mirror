const async = require('async');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const exec = require('child_process').exec;

const allCameras = [ ];

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
                imageSource = $(this).attr('src').replace("?COUNTER", "");
                verifyCam(imageSource);
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
  })
}

function verifyCam(url) {
  const child = exec('curl -I --connect-timeout 2 ' + url, (error, stdout, stderr) => {
    if (error) {
      console.error('curl error', error);
    }
    if (stderr) {
      // console.error('curl stderr', stderr);
    }

    if (stdout) {
      if (stdout.includes('200 OK')) {
        allCameras.push(url);
        return;
      } else {
        console.log('rejected: ', stdout);        
      }
    }
  });
}

module.exports = scrapedCameras;