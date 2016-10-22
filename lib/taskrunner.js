'use strict'

var AWS = require('aws-sdk');

module.exports = {
  makeCmd: function(options) {
    return [
      'bash', '-c',
      `${options.cmd} || true; EXIT_CODE=$?; echo TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64); exit $EXIT_CODE;`
    ];
  },

  run: function(options, cb) {
    var ecs = new AWS.ECS();

    var params = {
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

    ecs.runTask(params, cb);
  }
}
