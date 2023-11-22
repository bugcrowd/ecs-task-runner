'use strict'

const { mockClient } = require('aws-sdk-client-mock');
const { CloudWatchLogs, GetLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const expect = require('expect.js');
const LogsStream = require('../lib/log-stream');

describe('LogStream', function () {
  this.timeout(5000);
  const cwlMock = mockClient(CloudWatchLogs);
  afterEach(() => { cwlMock.reset(); });

  const options = {
    logGroup: 'yee',
    logStream: `yo`,
    endOfStreamIdentifier: 'ohiv09vaepnjpasv'
  }

  const staticLogs = [
    { timestamp: 1477346285562, message: 'Weee logs' },
    { timestamp: 1477346285563, message: 'more logs' },
    { timestamp: 1477346285565, message: `TASK FINISHED: ${Buffer.from(options.endOfStreamIdentifier).toString('base64')}, EXITCODE: 44` }
  ];

  it('should fetch logs from AWS Cloudwatch ', function (done) {
    let invocationCount = 0;
    cwlMock.on(GetLogEventsCommand).callsFake((params) => {
      expect(params.logGroupName).to.equal(options.logGroup);
      expect(params.logStreamName).to.equal(options.logStream);

      const response = { events: [staticLogs[invocationCount]] };
      invocationCount++;

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(response)
        }, 200);
      });
    });

    const stream = new LogsStream(options);
    let logsCollection = [];

    stream.on('data', (data) => {
      logsCollection.push(data);
    });

    stream.on('end', () => {
      expect(logsCollection).to.eql(staticLogs);
      expect(stream.exitCode).to.eql(44);
      done();
    });
  });
});
