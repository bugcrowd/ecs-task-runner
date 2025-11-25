'use strict'

const { ECS } = require("@aws-sdk/client-ecs");

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

module.exports = {
  makeCmd: function (options) {
    return [
      'sh', '-c',
      `sh -c "${options.cmd}"; EXITCODE=$?; echo "TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64), EXITCODE: $EXITCODE"`
    ];
  },

  run: function (options, cb) {
    const ecs = new ECS({ region: region });
    const params = {
      cluster: options.clusterArn,
      taskDefinition: options.taskDefinitionArn,
      launchType: options.launchType,
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

    // Since yargs' boolean argument type will always be true or false, we can't distinguish between assignPublicIp not
    // being set and it being false. Therefore we'll always set it, as long as we have an awsvpcConfiguration block.
    if (options.subnets !== undefined || options.securityGroups !== undefined || options.assignPublicIp === true) {
      params.networkConfiguration = {
        awsvpcConfiguration: {
          assignPublicIp: options.assignPublicIp ? 'ENABLED' : 'DISABLED'
        }
      };
    }

    if (options.subnets !== undefined) {
      params.networkConfiguration.awsvpcConfiguration.subnets = options.subnets;
    }

    if (options.securityGroups !== undefined) {
      params.networkConfiguration.awsvpcConfiguration.securityGroups = options.securityGroups;
    }

    if (options.tags !== undefined) {
      params.tags = options.tags
    }
    
    ecs.runTask(params)
      .then(data => cb(null, data))
      .catch(err => cb(err, null));
  },

  stop: function (options, cb) {
    const ecs = new ECS({ region: region });
    const params = {
      cluster: options.clusterArn,
      task: options.taskId,
      reason: options.reason
    };

    ecs.stopTask(params)
      .then(data => cb(null, data))
      .catch(err => cb(err, null));
  }
}
