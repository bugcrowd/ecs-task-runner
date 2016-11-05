
var async = require('async');
var randomstring = require('randomstring');
var _ = require('lodash');
var AWS = require('aws-sdk');
var combiner = require('stream-combiner');

var taskRunner = require('./lib/taskrunner');
var LogStream = require('./lib/log-stream');
var FormatStream = require('./lib/format-transform-stream');

module.exports = function(options, cb) {
  AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
  });

  var containerDefinition = null;
  var loggingDriver = null;
  var logOptions = null;

  // Generate a random string we will use to know when
  // the log stream is finished.
  const endOfStreamIdentifier = randomstring.generate({
    length: 16,
    charset: 'alphabetic'
  });

  async.waterfall([
    function(next) {
      var ecs = new AWS.ECS();
      ecs.describeTaskDefinition({ taskDefinition: options.taskDefinitionArn }, function(err, result) {
        if (err) return next(err);

        if (!result.taskDefinition || !result.taskDefinition.taskDefinitionArn) {
          return next(new Error(`Could not find taskDefinition with the arn "${options.taskDefinitionArn}"`));
        }

        containerDefinition = _.find(result.taskDefinition.containerDefinitions, { 'name': options.containerName });

        if (!containerDefinition) {
          return next(new Error(`Could not find container by the name "${options.containerName}" in task definition`));
        }

        loggingDriver = containerDefinition['logConfiguration']['logDriver'];
        if (loggingDriver != 'awslogs') {
          return next(new Error('Logging dirver is awslogs. Can not stream logs unless logging driver is awslogs'));
        }

        logOptions = containerDefinition['logConfiguration']['options'];
        next();
      });
    },
    function(next) {
      var params = {
        clusterArn: options.clusterArn,
        taskDefinitionArn: options.taskDefinitionArn,
        containerName: options.containerName,
        cmd: options.cmd,
        endOfStreamIdentifier: endOfStreamIdentifier
      }

      taskRunner.run(params, next);
    }
  ], function(err, taskDefinition) {
    if (err) return cb(err);

    var taskArn = taskDefinition.tasks[0].taskArn;
    var taskId = taskArn.substring(taskArn.lastIndexOf('/')+1);

    var formatter = new FormatStream();
    var logs = new LogStream({
      logGroup: logOptions['awslogs-group'],
      logStream: `${logOptions['awslogs-stream-prefix']}/${options.containerName}/${taskId}`,
      endOfStreamIdentifier: endOfStreamIdentifier
    });
    
    var stream = combiner(logs, formatter);
    stream.logStream = logs;

    cb(null, stream);
  });
}
