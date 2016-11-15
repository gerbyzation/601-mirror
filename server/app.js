var express = require('express');
var async = require('async');

var request = require('request');
const client = require('shodan-client');
const util   = require('util');

const opbeat = require('opbeat').start({
  appId: '7175bcb323',
  organizationId: '2c89e2d518d64f2e8e4e3b0c5f7ba81a',
  secretToken: '8f12e915bc2d491417df256336ce3a4dbd4d50ee'
})

const app = express();
app.use(opbeat.middleware.express());
app.use(express.static('public'));
app.set('PORT', 80);

// Register API endpoints
require('./cameras')(app);

app.listen(3000, function () {
    console.log('App listening on 3000');
});

