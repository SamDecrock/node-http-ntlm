var httpntlm = require('../httpntlm');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var express = require('express');
var ntlm = require('express-ntlm');

var HTTP_PORT = 3000;
var HTTPS_PORT = 3001;
var PLAIN_PORT = 3002; // a server without NTLM, used for redirect / error tests

var httpServer, httpsServer, plainServer;

var credentials = {
  username: 'm$',
  password: 'stinks',
  workstation: 'choose.something',
  domain: 'somedomain'
};

function withCredentials (options) {
  return Object.assign({}, credentials, options);
}


describe('Integration tests', () => {

  before(function (done) {
    // Express.js server protected by NTLM.
    // It echoes back the NTLM info, the headers, the method and the body of the authenticated request.
    var app = express();

    app.use(ntlm({
      debug: function() {
        var args = Array.prototype.slice.apply(arguments);
        console.log.apply(null, args);
      },
      domain: 'MYDOMAIN',

      // use different port (default: 389)
      // domaincontroller: 'ldap://myad.example:3899',
    }));

    app.use(function (request, response, next) {
      // collect raw body
      var chunks = [];
      request.on('data', function (chunk) { chunks.push(chunk); });
      request.on('end', function () {
        request.rawBody = Buffer.concat(chunks).toString();
        next();
      });
    });

    app.all('*', function(request, response) {
      var data = {
        ntlm: request.ntlm,
        headers: request.headers,
        method: request.method,
        url: request.url,
        body: request.rawBody
      }

      response.end(JSON.stringify(data));
    });

    // Plain server without NTLM:
    //   /redirect -> redirects to the NTLM protected http server
    //   /badntlm  -> answers 401 with an invalid NTLM challenge
    //   /noauth   -> answers 200 without any www-authenticate header
    plainServer = http.createServer(function (request, response) {
      if (request.url === '/redirect') {
        response.writeHead(302, { 'Location': 'http://localhost:' + HTTP_PORT + '/redirected' });
        return response.end();
      }
      if (request.url === '/badntlm') {
        // answers with a type 1 message instead of a type 2 message
        response.writeHead(401, { 'WWW-Authenticate': 'NTLM TlRMTVNTUAABAAAAB7IIogoACgA4AAAAEAAQACgAAAAFASgKAAAAD0NIT09TRS5TT01FVEhJTkdTT01FRE9NQUlO' });
        return response.end();
      }
      response.writeHead(200);
      response.end('no ntlm here');
    });

    var tlsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'fixtures', 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'fixtures', 'cert.pem'))
    };

    httpServer = http.createServer(app);
    httpsServer = https.createServer(tlsOptions, app);

    var pending = 3;
    function started () {
      if (--pending === 0) done();
    }

    httpServer.listen(HTTP_PORT, started);
    httpsServer.listen(HTTPS_PORT, started);
    plainServer.listen(PLAIN_PORT, started);
  });

  after(function () {
    httpServer.close();
    httpsServer.close();
    plainServer.close();
  });


  it('simple authorization', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:" + HTTP_PORT
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      done();
    });
  });

  it('reuse keep-alive agent', (done) => {
    var myKeepaliveAgent = new http.Agent({keepAlive: true});

    httpntlm.get(withCredentials({
      url: "http://localhost:" + HTTP_PORT,
      agent: myKeepaliveAgent
    }), function (err, res){
      if(err) return done(err);

      httpntlm.get(withCredentials({
        url: "http://localhost:" + HTTP_PORT,
        agent: myKeepaliveAgent
      }), function (err, res){
        if(err) return done(err);

        var data = JSON.parse(res.body);
        assert.equal(data.ntlm.Authenticated, true);
        myKeepaliveAgent.destroy();
        done();
      });
    });
  });

  it('custom headers', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:" + HTTP_PORT + "/testheaders",
      headers: {
        'user-agent': 'my-useragent',
        'Authorization': 'will-be-omitted-by-the-module'
      }
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.headers['user-agent'], 'my-useragent');
      done();
    });
  });

  it('https', (done) => {
    httpntlm.get(withCredentials({
      url: "https://localhost:" + HTTPS_PORT + "/secure",
      rejectUnauthorized: false // self-signed test certificate
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.url, '/secure');
      done();
    });
  });

  it('https with custom keep-alive agent', (done) => {
    var myKeepaliveAgent = new https.Agent({keepAlive: true, rejectUnauthorized: false});

    httpntlm.get(withCredentials({
      url: "https://localhost:" + HTTPS_PORT,
      agent: myKeepaliveAgent
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      myKeepaliveAgent.destroy();
      done();
    });
  });

  it('follows redirect on the first request', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:" + PLAIN_PORT + "/redirect"
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.url, '/redirected');
      done();
    });
  });

  it('error when server does not send a www-authenticate header', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:" + PLAIN_PORT + "/noauth"
    }), function (err, res){
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'www-authenticate not found on response of second request');
      done();
    });
  });

  it('error when server sends an invalid NTLM challenge', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:" + PLAIN_PORT + "/badntlm"
    }), function (err, res){
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Server didn't return a type 2 message");
      done();
    });
  });

  it('without domain and workstation', (done) => {
    httpntlm.get({
      url: "http://localhost:" + HTTP_PORT,
      username: credentials.username,
      password: credentials.password
    }, function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.ntlm.UserName, credentials.username);
      done();
    });
  });

  it('error when server cannot be reached', (done) => {
    httpntlm.get(withCredentials({
      url: "http://localhost:1" // nothing listens here
    }), function (err, res){
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('post with body', (done) => {
    httpntlm.post(withCredentials({
      url: "http://localhost:" + HTTP_PORT + "/post",
      body: 'hello=world',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.method, 'POST');
      assert.equal(data.body, 'hello=world');
      assert.equal(data.headers['content-type'], 'application/x-www-form-urlencoded');
      done();
    });
  });

  it('post with json', (done) => {
    httpntlm.post(withCredentials({
      url: "http://localhost:" + HTTP_PORT + "/json",
      json: { hello: 'world' }
    }), function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.method, 'POST');
      assert.deepEqual(JSON.parse(data.body), { hello: 'world' });
      done();
    });
  });

  ['put', 'patch', 'delete', 'options'].forEach(function (method) {
    it('method ' + method, (done) => {
      httpntlm[method](withCredentials({
        url: "http://localhost:" + HTTP_PORT + "/" + method
      }), function (err, res){
        if(err) return done(err);

        var data = JSON.parse(res.body);
        assert.equal(data.ntlm.Authenticated, true);
        assert.equal(data.method, method.toUpperCase());
        done();
      });
    });
  });

  it('pre-hashed lm_password and nt_password', (done) => {
    httpntlm.get({
      url: "http://localhost:" + HTTP_PORT,
      username: credentials.username,
      lm_password: httpntlm.ntlm.create_LM_hashed_password(credentials.password),
      nt_password: httpntlm.ntlm.create_NT_hashed_password(credentials.password),
      workstation: credentials.workstation,
      domain: credentials.domain
    }, function (err, res){
      if(err) return done(err);

      var data = JSON.parse(res.body);
      assert.equal(data.ntlm.Authenticated, true);
      assert.equal(data.ntlm.UserName, credentials.username);
      done();
    });
  });

});
