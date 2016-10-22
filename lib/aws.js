'use strict'

var AWS = require('aws-sdk');
var region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

AWS.config.update({
  region: region
});

module.exports = AWS;
