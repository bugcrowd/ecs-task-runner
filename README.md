ECS Task Runner
===============

Run a task on ECS and receive output by sending task logs to Cloudwatch Logs and streaming them back to you.

Installation
------------

**NOTE:** We have moved the package under our `bugcrowd` NPM organization - this will be the only package location maintained going forward.

- For cli usage: `npm install -g @bugcrowd/ecs-task-runner`
- As a module: `npm install @bugcrowd/ecs-task-runner --save`

Usage
-----

ECS Task Runner requires an already existing ECS cluster and Task Definition. The Task Definition must send it's logs to AWS Cloudwatch (using awslogs-stream-prefix) and the ECS hosts will need an IAM role that has permission to do that.

### CLI Tool

```
Options:
  --cluster                                                           [required]
  --task-definition                                                   [required]
  --container-name                                                    [required]
  --cmd                                                               [required]
  --started-by
  --env
  --launch-type
  --assign-public-ip
  --subnets
  --security-groups
  --region                                                  (default: us-east-1)
```

#### cluster
The arn of your ECS Cluster

#### task-definition
The arn of your ECS Task Definition

#### container-name
The name of your container in your Task Definition that you want to run this command in

#### cmd
The command you want to run

#### started-by
If provided, this will show up as startedBy in your ECS console

#### env
This option is a key/value pair defined as `key=value` and can be repeated multiple times. Each
pair is passed as an environment variable to the container, where `key` is the name of the env var
and `value` is it's value.

#### launch-type
Specify the launchType for the task to be run. Valid options are EC2, FARGATE and EXTERNAL.
Default: EC2

### Network configuration
When awsvpc networking mode is configured for the task this requires the awsvpc configuration to
be specified when executing a taks. The following options can be used to do so. Subnets and security groups
are required options in this case.

#### assign-public-ip
Boolean whether to assign a public ip to the task.

#### subnets
Array of subnets to configure.

#### security-groups
Array of security-groups.

#### region
The AWS region used when accessing ECS and CloudWatch. If nothing is provided falls back to `us-east-1`.
The `AWS_DEFAULT_REGION` environment variable has precendence over this setting.

#### tag
This option is a key/value pair defined as `key=value` and can be repeated multiple times. Each pair is passed as a tag of the launched task, where `key` is the name of the tag and `value` is it's value.

### Example Module Usage

```
const ecsTaskRunner = require('ecs-task-runner');

const options = {
  clusterArn: 'xxx',
  taskDefinitionArn: 'xxx',
  containerName: 'xxx',
  cmd: 'echo hello'
};

ecsTaskRunner(options, function(err, stream) {
  if (err) throw err;

  stream.pipe(process.stdout);

  stream.on('error', (err) => {
    throw err;
  });
});
```
