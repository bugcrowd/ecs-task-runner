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
