const util = require('util');

/**
 * A Writable stream that does exactly nothing...
 */

const stream = require('stream');

function Drain(options) {
  if (!(this instanceof Drain))
    return new Drain(options);

  if (!options) options = {};
  stream.Writable.call(this, options);
} 

util.inherits(Drain, stream.Writable);

Drain.prototype._write = function (chunk, encoding, next) {
  // down the drain...
  next();
}

module.exports = Drain;