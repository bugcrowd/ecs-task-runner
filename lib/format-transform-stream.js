'use strict'

var Transform = require('stream').Transform;
var moment = require('moment');

require("colors");

class FormatTransformStream extends Transform {
  constructor(options) {
    super({ objectMode: true });
  }

  _transform(event, encoding, cb) {
    this.push(event.message+"\n");
    cb();
  }
}

module.exports = FormatTransformStream;
