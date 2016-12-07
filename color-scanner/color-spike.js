const fs = require('fs');
const getColors = require("get-image-colors");

const image = fs.readFileSync('/Users/gerbenneven/Desktop/Screen Shot 2016-11-02 at 14.53.42.png');

const start = Date.now();
getColors(image, 'image/png', function (err, colors) {
  if (err) return console.error(err);
  // do something with colors
  console.log('elapsed', Date.now() - start, 'ms');
  console.log((colors[0].rgb()[0] + colors[0].rgb()[1] + colors[0].rgb()[2]) / 6);
});