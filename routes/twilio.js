var request = require('request');
var geocoder = require('geocoder');
var twilio = require('twilio')(global.config.accountSid, global.config.authToken);

var router = function(app) {
  app.post('/sms', function(req, res) {
    var origin = req.body.From;
    var pattern = '.+/.+/.+';
    var baseUrl = req.protocol + '://' + req.get('host');
    // overwrite api server when in development, make sure to run this app with `foreman start`
    if ('development' == app.get('env')) {
      baseUrl = "http://localhost:5000";
    } else if('test' == app.get('env')) {
      baseUrl = "http://salvavida.org";
    }

    var feedPosted = function(err, response, body) {
      var msg = '';
      if (body.errors) {
        msg = body.errors[0].msg;
      } else {
        msg = 'Thanks for using salvavida.org. A record has been created/updated for: '+body.name;
      }
      twilio.sms.messages.create({
        from: global.config.sender,
        to: origin,
        body: msg
      }, function() {
        // always send a 200 - OK
        return res.end('OK', 200);
      });
    }

    var wrongRequest = function() {
      var msg = 'Please send your request in the format state/name/address. State can be "open" if it is a new case, or "closed".';
      feedPosted('Invalid syntax', {statusCode: '400'}, {errors: [{msg: msg}]});
    };

    if (req.body.Body && req.body.Body.match(pattern)) {
      var message = req.body.Body.split('/', 3);
      var state = message[0];
      var name = message[1];
      var rawAddress = message[2];

      // geocode 
      geocoder.geocode(rawAddress, function(err, data) {
        if (!err && data && data.results && data.results.length > 0) {
          var loc = data.results[0].geometry.location;
          var address = data.results[0].formatted_address;
          var feed = {
            name: name,  
            lat: loc.lat,
            lng: loc.lng,
            address: address
          };
          if (state.toLowerCase() == 'open') {
            // save new feed
            request.post({uri: baseUrl + '/sos', json:true, body:feed}, feedPosted);
          } else if (state.toLowerCase() == 'closed') {
            // close feed
            request.post({uri: baseUrl + '/rescue', json:true, body:feed}, feedPosted);
          } else {
            wrongRequest();
          }
        } else {
          wrongRequest();
        }
      });
    } else {
      wrongRequest();
    }
  });
}

module.exports = router;