'use strict';

const async        = require('async'),
      randomstring = require('randomstring'),
      _            = require('lodash'),
      AWS          = require('aws-sdk'),
      combiner     = require('stream-combiner'),
      taskRunner   = require('./lib/taskrunner'),
      LogStream    = require('./lib/log-stream'),
      FormatStream = require('./lib/format-transform-stream');

module.exports = function(options, cb) {
  AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION || options.region
  });

  var containerDefinition = null,
      loggingDriver       = null,
      logOptions          = null;

  // Generate a random string we will use to know when
  // the log stream is finished.
  const endOfStreamIdentifier = randomstring.generate({
    length: 16,
    charset: 'alphabetic'
  });

  async.waterfall([
    function(next) {
      const ecs = new AWS.ECS();
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
        cmd: options.cmd,
        containerName: options.containerName,
        endOfStreamIdentifier: endOfStreamIdentifier,
        env: options.env,
        startedBy: options.startedBy,
        taskDefinitionArn: options.taskDefinitionArn
      }

      taskRunner.run(params, next);
    }
  ], function(err, taskDefinition) {
    if (err) return cb(err);

    const taskArn = taskDefinition.tasks[0].taskArn,
          taskId  = taskArn.substring(taskArn.lastIndexOf('/')+1),
          formatter = new FormatStream();

    const logs = new LogStream({
      logGroup: logOptions['awslogs-group'],
      logStream: `${logOptions['awslogs-stream-prefix']}/${options.containerName}/${taskId}`,
      endOfStreamIdentifier: endOfStreamIdentifier
    });

    var stream = combiner(logs, formatter);
    stream.logStream = logs;

    process.on('SIGINT', () => {
      console.log(`Received SIGINT. Asking ECS to stop task: ${taskId}`);

      const params = {
        clusterArn: options.clusterArn,
        taskId: taskId,
        reason: 'User requested interrupt'
      };

      taskRunner.stop(params, () => {
        logs.shutDown();
      });
    });

    cb(null, stream);
  });
}
