const stream = require('stream');
const util = require('util');

const Drain = require('./Drain');

function Channel(dest, options) {
  if (!(this instanceof Channel)) {
    return new Channel(dest, options);
  }

  this.destination = dest;
  this.drain = new Drain();

  if (!options) options = {};
  stream.Transform.call(this, options);
}

util.inherits(Channel, stream.Transform);

Channel.prototype._transform = function (chunk, encoding, next) {
  if (this.destination) {
    this.destination.write(chunk, 'buffer');
  } else {
    this.drain.write(chunk, 'buffer');
  }
  next();
}

Channel.prototype.set = function (dest) {
  this.destination = dest;
}

Channel.prototype.unpipe = function () {
  this.destination = undefined;
}

module.exports = Channel;