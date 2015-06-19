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

      return new Promise(function(resolve, reject) {

        try {
        console.dir(discovered, { depth: null, colors: true });

        var hosts = Object.keys(discovered);
        var host = hosts[0];
        var info = discovered[host];

        console.log(info);

        var crypto = require('crypto');
        var tls = require('tls');
        var fs = require('fs');

        var key = fs.readFileSync('tmp/key.pem');
        var cert = fs.readFileSync('tmp/cert.pem');

        // openssl x509 -in tmp/cert.pem -fingerprint -noout -sha256
        var fingerprint = '91:35:5D:30:BC:DD:EF:1F:92:AB:B3:9E:BF:FD:82:55:54:02:81:03:F4:07:81:DE:18:78:CE:A1:30:DD:AE:40';
        var randomBytes = new Buffer('0123456701234567');

        var oob = {
          sha256: fingerprint,
          k: randomBytes
        };

        var options = {
          host: host,
          port: info.services.devtools.port,
          key: key,
          cert: cert
        };

        console.log(options);

        qrcode.generate(JSON.stringify(oob));

        var client = tls.connect(options/*, function() {
          console.log('CONNECTED');
          var cert = client.getPeerCertificate();
          console.log(cert);
        }*/);

        client.on('secureConnect', function() {
          console.log('secureConnect');
        });

        client.on('data', function(data) {
          console.log('data', data);
        });

        client.on('timeout', function() {
          console.log('timeout');
        });

        client.on('close', function() {
          console.log('close');
        });

        client.on('end', function() {
          console.log('END');
        });
        } catch (e) {
          console.error(e);
          reject(e);
        }

      });

    }).then(function() {
      console.log('done');
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
