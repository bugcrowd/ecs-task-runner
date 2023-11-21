'use strict'

const _ = require('lodash');
const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const moment = require('moment');
const Readable = require('stream').Readable;

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

// Take cloudwatchlogs.getLogEvents data and
// return logs events as strings
function renderLogEvents(data) {
  const lines = _.map(data.events, function (event) {
    return moment(event.timestamp).format('Y-MM-DD H:m:ss ZZ').cyan + ' ' + event.message;
  });

  return lines.join("\n");
}

class LogStream extends Readable {
  constructor(options) {
    options.objectMode = true;
    super(options);

    this.options = _.defaults(options, {
      durationBetweenPolls: 1000,
      timeoutBeforeFirstLogs: 300 * 1000
    });

    this.eventBuffer = [];
    this.pending = false;
    this.logsReceived = false;
    this.streamEnded = false;
    this.cloudwatchlogs = new CloudWatchLogs({ region: region });
    this.stopRequested = false;
  }

  fetchLogs(_cb) {
    this.pending = true;

    const params = {
      logGroupName: this.options.logGroup,
      logStreamName: this.options.logStream,
      startFromHead: true,
      nextToken: this.nextToken
    };

    let next = (_err, _data) => {
      setTimeout(this._read.bind(this), this.options.durationBetweenPolls);
    };

    this.cloudwatchlogs.getLogEvents(params)
      .then((data) => {
        this.pending = false;

        if (data && data.events.length > 0) {
          this.nextToken = data.nextForwardToken;
          this.logsReceived = true;
          data.events.forEach((event) => this.eventBuffer.push(event));
        }

        // If we haven't recieved any logs at all and timeoutBeforeFirstLogs duration has passed. Fail
        if (!this.logsReceived && (Date.now() - this.startTime) > this.options.timeoutBeforeFirstLogs) {
          const err = new Error(`No logs recieved before timeoutBeforeFirstLogs option set at '${this.options.timeoutBeforeFirstLogs}'`);
          return process.nextTick(() => this.emit('error', err));
        }

        // Check to see if the log stream has ended. We listen for base64
        // version of eof identifiter so that listener doesn't accidentally
        // catch the eof identifier if container echo's out running command.
        const endOfStreamIdentifierBase64 = Buffer.from(this.options.endOfStreamIdentifier).toString('base64');
        const endEvent = _.find(data.events, (event) => event.message.includes(endOfStreamIdentifierBase64));

        if (this.stopRequested) {
          this.exitCode = 130;
        }

        if (endEvent) {
          this.streamEnded = true;

          const matches = endEvent.message.match(/EXITCODE: (\d+)/);
          if (matches) {
            this.exitCode = matches[1] || 0;
          }
        }

        next();
      })
      .catch((err) => {
        // Dismiss log stream not found. Log stream won't exist
        // until container starts logging
        if (err && 'ResourceNotFoundException' === err.code) return next();
        if (err) return process.nextTick(() => this.emit('error', err));
      });
  }

  shutDown() {
    this.stopRequested = true;
  }

  _read() {
    let active = true;
    while (active && this.eventBuffer.length) active = this.push(this.eventBuffer.shift());

    // Downstream buffers are full. Lets give them 100ms to recover
    if (!active) return setTimeout(this._read.bind(this), 100);

    if (this.streamEnded || this.stopRequested) return this.push(null);
    if (active && !this.pending) this.fetchLogs();
  }
}

module.exports = LogStream;
