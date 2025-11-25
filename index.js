'use strict';

const util = require('util');
const { ECS } = require("@aws-sdk/client-ecs");
const combiner = require('stream-combiner');
const FormatStream = require('./lib/format-transform-stream');
const LogStream = require('./lib/log-stream');
const randomstring = require('randomstring');
const taskRunner = require('./lib/taskrunner');

module.exports = function (options, cb) {
  const region = process.env.AWS_DEFAULT_REGION || options.region

  let containerDefinition = null;
  let loggingDriver = null;
  let logOptions = null;

  // Generate a random string we will use to know when
  // the log stream is finished.
  const endOfStreamIdentifier = randomstring.generate({
    length: 16,
    charset: 'alphabetic'
  });

  const ecs = new ECS({ region: region });
  ecs.describeTaskDefinition({ taskDefinition: options.taskDefinitionArn })
    .then((result) => {
      if (!result.taskDefinition || !result.taskDefinition.taskDefinitionArn) {
        throw new Error(`Could not find taskDefinition with the arn "${options.taskDefinitionArn}"`);
      }

      containerDefinition = result.taskDefinition.containerDefinitions.find((def) => {
        return def.name === options.containerName;
      });

      if (!containerDefinition) {
        throw new Error(`Could not find container by the name "${options.containerName}" in task definition`);
      }

      loggingDriver = containerDefinition['logConfiguration']['logDriver'];
      if (loggingDriver != 'awslogs') {
        throw new Error('Logging dirver is awslogs. Can not stream logs unless logging driver is awslogs');
      }

      if (result.taskDefinition.networkMode === 'awsvpc') {
        if (options.subnets === undefined || options.securityGroups === undefined) {
          throw new Error('Task definition networkMode is awsvpc, this requires you to specify subnets and security-groups.');
        }
      }
      else {
        if (options.subnets !== undefined || options.securityGroups !== undefined || options.assignPublicIp) {
          throw new Error('Network options are only allowed when task definition networkMode is awsvpc. You should not specify subnets, security-groups or assign-public-ip');
        }
      }

      logOptions = containerDefinition['logConfiguration']['options'];
    })
    .then(() => {
      const params = {
        clusterArn: options.clusterArn,
        cmd: options.cmd,
        containerName: options.containerName,
        endOfStreamIdentifier: endOfStreamIdentifier,
        env: options.env,
        startedBy: options.startedBy,
        taskDefinitionArn: options.taskDefinitionArn,
        launchType: options.launchType,
        assignPublicIp: options.assignPublicIp,
        subnets: options.subnets,
        securityGroups: options.securityGroups,
        tags: options.tags
      };

      taskRunner.runPromisified = util.promisify(taskRunner.run);
      return taskRunner.runPromisified(params);
    })
    .then((taskDefinition) => {
      if (taskDefinition.failures && taskDefinition.failures.length > 0) {
        throw new Error("ECS RunTask returned failure messages", { cause: taskDefinition.failures });
      }

      const taskArn = taskDefinition.tasks[0].taskArn;
      const taskId = taskArn.substring(taskArn.lastIndexOf('/') + 1);
      const formatter = new FormatStream();

      const logs = new LogStream({
        logGroup: logOptions['awslogs-group'],
        logStream: `${logOptions['awslogs-stream-prefix']}/${options.containerName}/${taskId}`,
        endOfStreamIdentifier: endOfStreamIdentifier
      });

      const stream = combiner(logs, formatter);
      stream.logStream = logs;
      stream.taskRunner = taskRunner;
      stream.taskId = taskId;

      cb(null, stream);
    })
    .catch((err) => {
      cb(err);
    });
}
