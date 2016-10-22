'use strict'

var Readable = require('stream').Readable;
var AWS = require('aws-sdk');

// Take cloudwatchlogs.getLogEvents data and
// return logs events as strings
function renderLogEvents(data) {
  var lines = _.map(data.events, function(event) {
    return moment(event.timestamp).format('Y-MM-DD H:m:ss ZZ').cyan+' '+event.message;
  });

  return lines.join("\n");
}

class LogStream extends Readable {
  constructor(options) {
    this.options = options;
    super(options);
  }

  _read() {
    var stream = this;
    var logsReceived = false;
    var timeoutBeforeFirstLogs = 300*1000;

    var params = {
      logGroupName: this.options.logGroup,
      logStreamName: this.options.logStream,
      startFromHead: true
    };

    async.doUntil(function(cb) {
      function next(err, data) {
        setTimeout(_.partial(cb, err, data), 1000);
      }

      cloudwatchlogs.getLogEvents(params, function(err, data) {
        // Log stream won't exist until container starts logging
        if (err && 'ResourceNotFoundException' === err.code) return next();
        next(err, data);
      });
    }, function(data) {
      if (!data) return false;

      // If we haven't recieved any logs at all and timeoutBeforeFirstLogs duration has passed. Fail
      if (!logsReceived && (Date.now() - startTime) > timeoutBeforeFirstLogs) {
        console.log(`No logs recieved before timeoutBeforeFirstLogs paramater set at '${timeoutBeforeFirstLogs}'`.red);
        process.exit(1);
      }

      var logs = renderLogEvents(data);
      params.nextToken = data.nextForwardToken;

      if (logs) {
        logsReceived = true;
        stream.push(logs);
      }

      // Check to see if the log stream has ended. We listen for base64
      // version of eof identifiter so that listener doesn't accidentally
      // catch the eof identifier if container echo's out running command.
      return logs.includes(eof_identifier_base64);
    }, cb);
  }
}

module.exports = LogStream
