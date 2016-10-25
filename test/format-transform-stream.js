'use strict'

var expect = require('expect.js');
var AWS = require('aws-sdk-mock');

var FormatTransformStream = require('../lib/format-transform-stream');

describe('FormatTransformStream', function() {
  it('should format logs from objects to strings', function(done) {
    var stream = new FormatTransformStream();
    stream.write({ timestamp: 1477346285562, message: 'Weee logs' });

    stream.on('data', (data) => {
      expect(data).to.eql("\u001b[36m2016-10-24 14:58:05 -0700\u001b[39m Weee logs\n");
      done();
    });
  });
});
