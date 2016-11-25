const stream = require('stream');
const util = require('util');
const sharp = require('sharp');

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

module.exports = Resizer;