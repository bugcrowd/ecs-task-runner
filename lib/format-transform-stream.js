'use strict'

var Transform = require('stream').Transform;
var moment = require('moment');

require("colors");

class formatTransformStream extends Transform {
  constructor(options) {
    super({ objectMode: true });
  }

  _transform(event, encoding, cb) {
    var log = moment(event.timestamp).format('Y-MM-DD H:m:ss ZZ').cyan+' '+event.message+"\n";
    this.push(log);
    cb();
  }
}

module.exports = formatTransformStream;
