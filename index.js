
var async = require('async');
var taskRunner = require('./lib/taskrunner');
var logStream = require('./lib/logstream');

var AWS = require('aws-sdk');
var region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

AWS.config.update({
  region: region
});

// Generate a random string we will use to know when
// the log stream is finished.
const endOfStreamIdentifier = randomstring.generate({
  length: 16,
  charset: 'alphabetic'
});

var containerDefinition = null;
var loggingDriver = null;
var logGroup = null;

module.exports = function(options, cb) {
  async.waterfall([
    function(next) {
      ecs.describeTaskDefinition({ taskDefinition: options.taskDefinition }, function(err, taskDefinition) {
        containerDefinition = _.find(taskDefinition.containerDefinitions, { 'name': options.containerName });

        if (!containerDefinition) {
          return cb(new Error(`Could not find container by the name "${options.containerName}" in task definition`));
        }

        loggingDriver = containerDefinition['logConfiguration']['logDriver'];
        if (loggingDriver != 'awslogs') {
          return cb(new Error('Logging dirver is awslogs. Can not stream logs unless logging driver is awslogs'));
        }

        logOptions = containerDefinition['logConfiguration']['options'];
        cb();
      });
    },
    function(taskDefinition, next) {
      var params = {
        clusterArn: options.clusterArn,
        taskDefinitionArn: options.taskDefinitionArn,
        endOfStreamIdentifier: endOfStreamIdentifier
      }

      taskRunner.run(params, cb);
    }
  ], function(err, taskDefinition) {
    if (err) throw err;

    var stream = new logStream({
      containerName: options.containerName,
      logGroup: logOptions['awslogs-group'],
      logStream: `ecs/${argv.containerName}/${taskId}`,
      taskArn: 'xxx',
      endOfStreamIdentifier: endOfStreamIdentifier
    });

    cb(null, stream);
  });
}
