'use strict';

/* global -Promise */
var Promise = require('es6-promise').Promise;
//var mockery = require('mockery');
//var nodemock = require('nodemock');

var qrcode = require('qrcode-terminal');

module.exports = {

  'findWifiDevices() exists': function(test) {
    var findWifiDevices = require('../../index');
    findWifiDevices().then(function(result) {
      test.equal(result, false);
      test.done();
    });
  },

  'play': function(test) {

    discoverDevices().then(function(discovered) {

      console.log('DISCOVERED');
      console.dir(discovered, { depth: null, colors: true });
      qrcode.generate(JSON.stringify(discovered));
      test.done();

    }).catch(function(err) {
      console.error(err);
    });

  }

};

var dgram = require('dgram');

function discoverDevices() {

  var MULTICAST_ADDR = '224.0.0.115';
  var SCAN_PORT = 50624;
  var UPDATE_PORT = 50625;
  var PING_INTERVAL = 1000;
  var RESOLVE_TIMEOUT = 250;

  var LOCAL_DEVICE = {
    'device': 'test-device',
    'services': {}
  };

  var client = dgram.createSocket('udp4');
  var discovered = {};

  return new Promise(function(resolve, reject) {

    var resolveTimer, pingTimer;

    client.on('listening', function() {
      client.setBroadcast(true);
      client.setMulticastTTL(128);
      client.addMembership(MULTICAST_ADDR);
    });

    client.on('message', function(message, remote) {
      discovered[remote.address] = JSON.parse(message);
      if (resolveTimer) {
        clearTimeout(resolveTimer);
      }
      resolveTimer = setTimeout(cleanupAndResolve, RESOLVE_TIMEOUT);
    });

    function cleanupAndResolve() {
      client.close();
      if (pingTimer) {
        clearTimeout(pingTimer);
      }
      resolve(discovered);
    }

    function ping() {
      var message = JSON.stringify(LOCAL_DEVICE);
      client.send(message, 0, message.length, SCAN_PORT, MULTICAST_ADDR);

      pingTimer = setTimeout(function() {
        if (Object.keys(discovered).length === 0) { ping(); }
      }, PING_INTERVAL);
    }

    client.bind(UPDATE_PORT, ping);

  });

}
