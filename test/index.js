'use strict'

const { mockClient } = require('aws-sdk-client-mock');
const { ECS, DescribeTaskDefinitionCommand, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { CloudWatchLogs, GetLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const expect = require('expect.js');
const { promisify } = require('node:util');
const index = promisify(require('../index'));

describe('index', function () {
  const cwlMock = mockClient(CloudWatchLogs);
  const ecsMock = mockClient(ECS);
  afterEach(() => {
    cwlMock.reset();
    ecsMock.reset();
  });

  it('should do the thing', async function () {
    const options = {
      taskDefinitionArn: 'task-definition.arn',
      containerName: 'meow'
    };

    ecsMock.on(DescribeTaskDefinitionCommand).callsFake(async params => {
      expect(params.taskDefinition).to.eql(options.taskDefinitionArn)

      return {
        taskDefinition: {
          taskDefinitionArn: options.taskDefinitionArn,
          containerDefinitions: [{
            name: options.containerName,
            logConfiguration: {
              logDriver: 'awslogs',
              options: { 'awslogs-group': '', 'awslogs-stream-prefix': '' },
            }
          }],
        }
      }
    });

    // thread the randon EOF through to kill the stream
    let eofSet;
    const eof = new Promise(r => {
      eofSet = r;
    })
    ecsMock.on(RunTaskCommand).callsFake(async params => {
      expect(params.taskDefinition).to.eql(options.taskDefinitionArn)

      eofSet(params.overrides.containerOverrides[0].command[2].split(' ')[9])

      return {
        tasks: [{
          taskArn: ''
        }]
      }
    });

    cwlMock.on(GetLogEventsCommand).callsFake(async _params => {
      return {
        events: [{
          timestamp: 1477346285562,
          message: Buffer.from(await eof).toString('base64'),
        }]
      };
    });

    // if this returns without crashing we're gucci
    return index(options);
  });


  it('should warn us when a task fails to launch', async function () {
    const options = {
      taskDefinitionArn: 'task-definition.arn',
      containerName: 'meow'
    };

    ecsMock.on(DescribeTaskDefinitionCommand).callsFake(async params => {
      expect(params.taskDefinition).to.eql(options.taskDefinitionArn)

      return {
        taskDefinition: {
          taskDefinitionArn: options.taskDefinitionArn,
          containerDefinitions: [{
            name: options.containerName,
            logConfiguration: {
              logDriver: 'awslogs',
              options: { 'awslogs-group': '', 'awslogs-stream-prefix': '' },
            }
          }],
        }
      }
    });

    const reason = 'ECS is haunted'
    ecsMock.on(RunTaskCommand).callsFake(async params => {
      expect(params.taskDefinition).to.eql(options.taskDefinitionArn)

      return {
        failures: [{ reason }]
      }
    });

    try {
      await index(options);
      expect().fail("App should have thrown an error about ECS returning errors")
    } catch (err) {
      expect(err.cause[0].reason).to.eql(reason)
    }
  });
});
