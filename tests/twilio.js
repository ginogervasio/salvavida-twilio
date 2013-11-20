var assert = require('assert');
var util = require('util');
var request = require('request');
var BASE_URL = 'http://localhost:5100';
var mongoose = require('mongoose');

// initialize model object
var Feed = require('./models/feed');

// enable twilio library mock
var mockery = require('mockery');
mockery.enable({warnOnUnregistered: false});
var lastMessage = null;
var twilioMock = function(hash) {
  return {
    sms: {
      messages: {
        create: function(hash, done) {
          lastMessage = hash;
          done();
        }
      }
    }
  }
};
mockery.registerMock('twilio', twilioMock);

// start twilio service
process.env.PORT = 5100;
var twilioService = require('../twilio.js');


describe('Twilio Service', function() {
  describe('/sms receive sms', function() {
    beforeEach(function(done){
      lastMessage = null; // clear last mock message
      Feed.remove({}, done);
    });

    it('should send a confirmation sms', function(done) {
      var twilioSMSMockData = {
        Body: "open/Ulf/988 Fulton St, San Francisco", 
        From: "+14154706379"
      };
      request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
        assert.equal(response.statusCode, 200);
        assert.equal(lastMessage.to, twilioSMSMockData.From);
        assert.equal(lastMessage.body, 'Thanks for using salvavida.org. A record has been created/updated for: Ulf');
        done();
      });
    });

    it('should error when one tries to update the same address twice', function(done) {
      var twilioSMSMockData = {
        Body: "open/Ulf/988 Fulton St, San Francisco", 
        From: "+14154706379"
      };
      request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
        request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
          assert.equal(response.statusCode, 200);
          assert.equal(lastMessage.to, twilioSMSMockData.From);
          assert.equal(lastMessage.body, 'entry already exists.');
          done();
        });
      });
    });

    it('should send the user the syntax on malformed data', function(done) {
      var twilioSMSMockData = {
        Body: "MALFORMED DATA MUHAHAHA", 
        From: "+14154706379"
      };
      request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
        assert.equal(response.statusCode, 200);
        assert.equal(lastMessage.to, twilioSMSMockData.From);
        assert.equal(lastMessage.body, 'Please send your request in the format state/name/address. State can be "open" if it is a new case, or "closed".');
        done();
      });
    });

    it('should open and then close the data', function(done) {
      var Body = "/Ulf/988 Fulton St, San Francisco";
      var twilioSMSMockData = {
        Body: null, 
        From: "+14154706379"
      };
      twilioSMSMockData.Body = 'open' + Body;
      request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
        assert.equal(lastMessage.body, 'Thanks for using salvavida.org. A record has been created/updated for: Ulf');
        twilioSMSMockData.Body = 'closed' + Body;
        request.post({uri: BASE_URL + '/sms', json:true, body:twilioSMSMockData}, function(err, response, data) {
          assert.equal(response.statusCode, 200);
          assert.equal(lastMessage.to, twilioSMSMockData.From);
          assert.equal(lastMessage.body, 'Thanks for using salvavida.org. A record has been created/updated for: Ulf');
          Feed.findOne({}, function(err, feed) {
            assert.equal('closed', feed.state);
            done();
          });
        });
      });
    });
  });
});
