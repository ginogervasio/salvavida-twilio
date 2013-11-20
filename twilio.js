var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

// load global config file based on environment
var config = require('./config')(app.get('env'));
global.config = config;

// all environments
app.set('port', process.env.PORT || 5000);
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env') || 'test' == app.get('env')) {
  app.use(express.errorHandler({showStack: true, dumpExceptions: true}));
}
else
{
  app.use(express.errorHandler()); 
}

// routers
var twilioRouter = require('./routes/twilio')(app);

// Start server
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
