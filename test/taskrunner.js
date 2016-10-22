'use strict'

var expect = require('expect.js');
var AWS = require('aws-sdk-mock');

var taskRunner = require('../lib/taskrunner');

describe('TaskRunner', function() {
  it('should construct command', function() {
    var options = {
      cmd: 'mycommand --arg "Woot"',
      endOfStreamIdentifier: "1234"
    };

    var cmd = taskRunner.makeCmd(options);

    expect(cmd).to.eql([
      'bash', '-c',
      `${options.cmd} || true; EXIT_CODE=$?; echo TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64); exit $EXIT_CODE;`
    ]);
  })

  it('should make a call to AWS.ECS with correct arguments', function(done) {
    var options = {
      clusterArn: 'cluster.arn',
      taskDefinitionArn: 'task-definition.arn',
      containerName: 'container name',
      cmd: 'mycommand --arg "Woot"',
      endOfStreamIdentifier: '1234'
    };

    AWS.mock('ECS', 'runTask', function (params, cb){
      expect(params.cluster).to.equal(options.clusterArn);
      expect(params.taskDefinition).to.equal(options.taskDefinitionArn);

      var cmdOverride = params.overrides.containerOverrides[0];
      expect(cmdOverride.name).to.equal(options.containerName);
      expect(cmdOverride.command).to.eql(taskRunner.makeCmd(options));
      cb(null, { taskArn: "Yo" });
    });

    taskRunner.run(options, function(err, task) {
      expect(err).to.equal(null);
      done();
    });
  });

  after(function() {
    AWS.restore('ECS', 'runTask');
  });
});
