'use strict'

const AWS        = require('aws-sdk-mock'),
      expect     = require('expect.js'),
      taskRunner = require('../lib/taskrunner');

describe('TaskRunner', function() {
  it('should construct command', function() {
    var options = {
      cmd: 'mycommand --arg "Woot"',
      endOfStreamIdentifier: "1234"
    };

    var cmd = taskRunner.makeCmd(options);

    expect(cmd).to.eql([
      'bash', '-c',
      `bash -c "${options.cmd}"; EXITCODE=$?; echo "TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64), EXITCODE: $EXITCODE"`
    ]);
  })

  describe('with AWS.ECS mocked', function() {
    afterEach(function() {
      AWS.restore('ECS', 'runTask');
    });

    it('should make a call to AWS.ECS with correct arguments not including env', function(done) {
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

    it('should make a call to AWS.ECS with correct arguments including env', function(done) {
      var options = {
        clusterArn: 'cluster.arn',
        taskDefinitionArn: 'task-definition.arn',
        containerName: 'container name',
        cmd: 'mycommand --arg "Woot"',
        endOfStreamIdentifier: '1234',
        startedBy: 'Bugs Bunny',
        env: [{ name: 'TERM', value: 'xterm-256color' }, { name: 'OTHER', value: 'things' }]
      };

      AWS.mock('ECS', 'runTask', function (params, cb){
        expect(params.cluster).to.equal(options.clusterArn);
        expect(params.taskDefinition).to.equal(options.taskDefinitionArn);
        expect(params.startedBy).to.equal(options.startedBy);

        var cmdOverride = params.overrides.containerOverrides[0];
        expect(cmdOverride.name).to.equal(options.containerName);
        expect(cmdOverride.command).to.eql(taskRunner.makeCmd(options));
        expect(cmdOverride.environment).to.equal(options.env);
        cb(null, { taskArn: "Yo" });
      });

      taskRunner.run(options, function(err, task) {
        expect(err).to.equal(null);
        done();
      });
    });
  });
});
