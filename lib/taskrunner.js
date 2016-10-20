'use strict'

const AWS = require('./aws');
const ecs = new AWS.ECS();

module.exports = function runTask(options, cb) {
  var cmd = [
    'bash', '-c',
    `${options.cmd} || true; EXIT_CODE=$?; echo TASK FINISHED: $(echo -n ${eof_identifier} | base64); exit $EXIT_CODE;`
  ]

  var params = {
    cluster: options.cluster,
    taskDefinition: options.taskDefinition,
    overrides: {
      containerOverrides: [
        {
          name: options.containerName,
          command: cmd
        }
      ]
    }
  };

  ecs.runTask(params, cb);
}
