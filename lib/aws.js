'use strict'

var AWS = require('AWS');
var region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

AWS.config.update({
  region: region
});

module.exports = AWS;
