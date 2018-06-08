'use strict'

const expect                = require('expect.js');
const FormatTransformStream = require('../lib/format-transform-stream');

describe('FormatTransformStream', function() {
  it('should format logs from objects to strings', function(done) {
    const stream = new FormatTransformStream();
    stream.write({ timestamp: 1477346285562, message: 'Weee logs' });

    stream.on('data', (data) => {
      expect(data).to.eql("Weee logs\n");
      done();
    });
  });
});
