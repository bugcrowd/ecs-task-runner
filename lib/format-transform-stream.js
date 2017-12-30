'use strict'

const Transform = require('stream').Transform;

class FormatTransformStream extends Transform {
  constructor(_options) {
    super({ objectMode: true });
  }

  _transform(event, encoding, cb) {
    this.push(event.message+"\n");
    cb();
  }
}

module.exports = FormatTransformStream;
