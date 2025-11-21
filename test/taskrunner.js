'use strict'

const { mockClient } = require('aws-sdk-client-mock');
const { ECS, StopTaskCommand, RunTaskCommand } = require("@aws-sdk/client-ecs");
const expect = require('expect.js');
const taskRunner = require('../lib/taskrunner');

describe('TaskRunner', function () {
  it('should construct command', function () {
    const options = {
      cmd: 'mycommand --arg "Woot"',
      endOfStreamIdentifier: "1234"
    };

    let cmd = taskRunner.makeCmd(options);

    expect(cmd).to.eql([
      'sh', '-c',
      `sh -c "${options.cmd}"; EXITCODE=$?; echo "TASK FINISHED: $(echo -n ${options.endOfStreamIdentifier} | base64), EXITCODE: $EXITCODE"`
    ]);
  })

  describe('#run', function () {
    let ecsMock;
    beforeEach(() => {
      ecsMock = mockClient(ECS);
    });

    it('should make a call to AWS.ECS with correct arguments not including env', function (done) {
      const options = {
        clusterArn: 'cluster.arn',
        taskDefinitionArn: 'task-definition.arn',
        containerName: 'container name',
        cmd: 'mycommand --arg "Woot"',
        endOfStreamIdentifier: '1234'
      };

      ecsMock.on(RunTaskCommand).callsFake((params) => {
        expect(params.cluster).to.equal(options.clusterArn);
        expect(params.taskDefinition).to.equal(options.taskDefinitionArn);
        
        const cmdOverride = params.overrides.containerOverrides[0];
        expect(cmdOverride.name).to.equal(options.containerName);
        expect(cmdOverride.command).to.eql(taskRunner.makeCmd(options));

        return Promise.resolve({ taskArn: "Yo" });
      });

      taskRunner.run(options, function (err, _task) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should make a call to AWS.ECS with correct arguments including env', function (done) {
      const options = {
        clusterArn: 'cluster.arn',
        taskDefinitionArn: 'task-definition.arn',
        containerName: 'container name',
        cmd: 'mycommand --arg "Woot"',
        endOfStreamIdentifier: '1234',
        startedBy: 'Bugs Bunny',
        env: [{ name: 'TERM', value: 'xterm-256color' }, { name: 'OTHER', value: 'things' }]
      };

      ecsMock.on(RunTaskCommand).callsFake((params) => {
        expect(params.cluster).to.equal(options.clusterArn);
        expect(params.taskDefinition).to.equal(options.taskDefinitionArn);
        expect(params.startedBy).to.equal(options.startedBy);

        const cmdOverride = params.overrides.containerOverrides[0];
        expect(cmdOverride.name).to.equal(options.containerName);
        expect(cmdOverride.command).to.eql(taskRunner.makeCmd(options));
        expect(cmdOverride.environment).to.equal(options.env);

        return Promise.resolve({ taskArn: "Yo" });
      });

      taskRunner.run(options, function (err, _task) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should make a call to AWS.ECS with correct arguments including tags', function (done) {
      const options = {
        clusterArn: 'cluster.arn',
        taskDefinitionArn: 'task-definition.arn',
        containerName: 'container name',
        cmd: 'mycommand --arg "Woot"',
        endOfStreamIdentifier: '1234',
        startedBy: 'Bugs Bunny',
        tags: [{ key: 'task', value: 'cleanup' }, { key: 'database', value: 'abc' }]
      };

      ecsMock.on(RunTaskCommand).callsFake((params) => {
        expect(params.cluster).to.equal(options.clusterArn);
        expect(params.taskDefinition).to.equal(options.taskDefinitionArn);
        expect(params.startedBy).to.equal(options.startedBy);
        expect(params.tags).to.equal(options.tags);

        const cmdOverride = params.overrides.containerOverrides[0];
        expect(cmdOverride.name).to.equal(options.containerName);
        expect(cmdOverride.command).to.eql(taskRunner.makeCmd(options));

        return Promise.resolve({ taskArn: "Yo" });
      });

      taskRunner.run(options, function (err, _task) {
        expect(err).to.equal(null);
        done();
      });
    });

  });

  describe('#stop', function () {
    const ecsMock = mockClient(ECS);
    beforeEach(() => { ecsMock.reset(); });

    it('should make a call to AWS.ECS with correct arguments', function (done) {
      const options = {
        clusterArn: 'cluster.arn',
        taskId: 'some-task-id',
        reason: 'user pressed ctrl-c'
      };

      ecsMock.on(StopTaskCommand).callsFake((params) => {
        expect(params.cluster).to.equal(options.clusterArn);
        expect(params.task).to.equal(options.taskId);
        expect(params.reason).to.equal(options.reason);

        return Promise.resolve({ taskArn: "Yo" });
      });

      taskRunner.stop(options, function (err, _task) {
        expect(err).to.equal(null);
        done();
      });
    });
  });
});
