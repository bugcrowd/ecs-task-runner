'use strict'

const AWS = require('aws-sdk');

module.exports = {
  makeCmd: function(options) {
    return [
      'bash', '-c',
      `bash -c "${options.cmd}"; EXITCODE=$?; echo "TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64), EXITCODE: $EXITCODE"`
    ];
  },

  run: function(options, cb) {
    const ecs = new AWS.ECS();
    const params = {
      cluster: options.clusterArn,
      taskDefinition: options.taskDefinitionArn,
      overrides: {
        containerOverrides: [
          {
            name: options.containerName,
            command: this.makeCmd(options)
          }
        ]
      }
    };

    if (options.startedBy !== undefined) {
      params.startedBy = options.startedBy;
    }

    if (options.env !== undefined) {
      params.overrides.containerOverrides[0].environment = options.env;
    }

    ecs.runTask(params, cb);
  },

  stop: function(options, cb) {
    const ecs = new AWS.ECS();
    const params = {
      cluster: options.clusterArn,
      task: options.taskId,
      reason: options.reason
    };

    ecs.stopTask(params, cb);
  }
}
