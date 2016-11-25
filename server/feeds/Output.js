const stream = require('stream');
const util = require('util');

function Output(options) {
  if (!(this instanceof Output)) {
    return new Output(options);
  }

  if (!options) options = {};
  stream.Transform.call(this, options);
}

util.inherits(Output, stream.Transform);

Output.prototype._write = function (chunk, encoding, next) {
  this.push("--myboundary\r\n");
  this.push("Content-Type: image/jpeg\r\n");
  this.push("Content-Length: " + chunk.length + "\r\n");
  this.push("\r\n");
  this.push(chunk);
  this.push("\r\n");
  next();
}

module.exports = Output;