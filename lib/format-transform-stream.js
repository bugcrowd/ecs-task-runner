'use strict'

var Transform = require('stream').Transform;
var moment = require('moment');

require("colors");

class FormatTransformStream extends Transform {
  constructor(options) {
    super({ objectMode: true });
  }

  _transform(event, encoding, cb) {
    var log = moment(event.timestamp).format('Y-MM-DD H:m:ss ZZ').grey+' '+event.message+"\n";
    this.push(log);
    cb();
  }
}

module.exports = FormatTransformStream;
