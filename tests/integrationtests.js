var httpntlm = require('../httpntlm');
var httpreq = require('httpreq');
var http = require('http');
var https = require('https');

function test_simpleAuthorization() {
  httpntlm.get({
    url: "http://localhost:3000",
    username: 'm$',
    password: 'stinks',
    workstation: 'choose.something',
    domain: 'somedomain'
  }, function (err, res){
    if(err) return console.log(err);

    console.log(res.headers);
    console.log(res.body);
  });
}

function test_reuseKeepaliveAgent() {
  var myKeepaliveAgent = new http.Agent({keepAlive: true});

  httpntlm.get({
    url: "http://localhost:3000",
    username: 'm$',
    password: 'stinks',
    workstation: 'choose.something',
    domain: 'somedomain',
    agent: myKeepaliveAgent
  }, function (err, res){
    if(err) return console.log(err);

    console.log(res.headers);
    console.log(res.body);

    httpreq.get("http://localhost:3000", {agent: myKeepaliveAgent}, function(err, res){
      if(err) return console.log(err);

      console.log(res.headers);
      console.log(res.body);
    });

  });
}

function test_customHeaders() {
  httpntlm.get({
    url: "http://localhost:3000",
    username: 'm$',
    password: 'stinks',
    workstation: 'choose.something',
    domain: 'somedomain',
    headers: {
      'User-Agent': 'my-useragent',
      'Authorization': 'will-be-omitted-by-the-module'
    }
  }, function (err, res){
    if(err) return console.log(err);

    console.log(res.headers);
    console.log(res.body);
  });
}


test_simpleAuthorization();
test_reuseKeepaliveAgent();
test_customHeaders();

