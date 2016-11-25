const stream = require('stream');
const util = require('util');

const Transform = stream.Transform;

function Logger(options) {
  if (!(this instanceof Logger))
    return new Logger(options);

  if (!options) options = {};
  Transform.call(this, options);
}

util.inherits(Logger, Transform);

Logger.prototype._transform = function (chunk, encoding, done) {
  process.stdout.push(chunk);
  this.push(chunk);
  done();
};

const logger = new Logger();
// logger.pipe(process.stdout);

logger.push('does this show?');