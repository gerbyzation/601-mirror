const async = require('async');
const request = require('request');
const redis = require('redis');
const jimp = require('jimp');

const r = redis.createClient();


const opbeat = require('opbeat').start({
  appId: '7175bcb323',
  organizationId: '2c89e2d518d64f2e8e4e3b0c5f7ba81a',
  secretToken: '8f12e915bc2d491417df256336ce3a4dbd4d50ee'
})

r.on('error', (err) => {
  console.log('Redis Error ' + err);
});


const q = async.queue(function(url, callback) {
  try {
    request.get({
      url,
      timeout: 5000,
    }, callback);
  } catch (e) {
      console.log(e);
  }
}, 20);

q.drain = function(){
  console.log('queue finished');
};

r.smembers('urls', (err, reply) => {
  if (err) return console.err;

  console.log('looping through queue', reply);
  for (var i = 0; i < reply.length; i++) {
    r.hset(reply[i], 'count', 0);
    console.log(reply[i]);
    addToQueue(reply[i]);
  }
});


function addToQueue(url) {
  q.push(url, function (error, response, body) {
    if (response) {
      if (response.headers["content-type"] == "image/jpeg" && response.headers['content-length'] > 0) {

        jimp.read(url, function (err, image) {
          console.log('finished reading', url);
          r.hincrby(url, 'count', 1); 
          addToQueue(url);
        });
      } else {
        console.log('invalid response', url);
      }
    }
  })
}