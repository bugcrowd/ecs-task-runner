'use strict'

var expect = require('expect.js');
var AWS = require('aws-sdk-mock');

var FormatTransformStream = require('../lib/format-transform-stream');

describe('FormatTransformStream', function() {
  it('should format logs from objects to strings', function(done) {
    var stream = new FormatTransformStream();
    stream.write({ timestamp: 1477346285562, message: 'Weee logs' });

    stream.on('data', (data) => {
      expect(data).to.eql("Weee logs\n");
      done();
    });
  });
});
