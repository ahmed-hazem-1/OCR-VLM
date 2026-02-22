const serverless = require('serverless-http');
const app = require('./src/app');

module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'multipart/form-data', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
});
