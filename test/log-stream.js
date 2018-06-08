'use strict'

const AWS        = require('aws-sdk-mock');
const expect     = require('expect.js');
const LogsStream = require('../lib/log-stream');

describe('LogStream', function() {
  this.timeout(5000);

  const options = {
    logGroup: 'yee',
    logStream: `yo`,
    endOfStreamIdentifier: 'ohiv09vaepnjpasv'
  }

  const staticLogs = [
    { timestamp: 1477346285562, message: 'Weee logs' },
    { timestamp: 1477346285563, message: 'more logs' },
    { timestamp: 1477346285565, message: `TASK FINISHED: ${new Buffer(options.endOfStreamIdentifier).toString('base64')}, EXITCODE: 44` }
  ];

  it('should fetch logs from AWS Cloudwatch ', function(done) {
    let fetch_count = 0;

    AWS.mock('CloudWatchLogs', 'getLogEvents', function (params, cb){
      expect(params.logGroupName).to.equal(options.logGroup);
      expect(params.logStreamName).to.equal(options.logStream);

      const res = {
        events: [ staticLogs[fetch_count] ]
      };

      fetch_count++;
      setTimeout(() => cb(null, res), 200);
    });

    const stream = new LogsStream(options);
    var logsCollection = [];

    stream.on('data', (data) => {
      logsCollection.push(data);
    });

    stream.on('end', () => {
      expect(logsCollection).to.eql(staticLogs);
      expect(stream.exitCode).to.eql(44);
      done();
    });
  });

  after(function() {
    AWS.restore('CloudWatchLogs', 'getLogEvents');
  });
});
