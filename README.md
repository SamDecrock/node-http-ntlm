# httpntlm

__httpntlm__ is a Node.js library to do HTTP NTLM authentication

It's a port from the Python libary [python-ntml](https://code.google.com/p/python-ntlm/) with added NTLMv2 support.

## Donate

Help keep my open source project alive! Your donation, no matter how small, makes a real difference.

Thank you for your support!


[![](https://neat.be/paypal-donate-button.png)](https://www.paypal.com/donate/?hosted_button_id=2CKNJLZJBW8ZC) [!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/samdecrock)



## Install

You can install __httpntlm__ using the Node Package Manager (npm):

    npm install httpntlm

## How to use

```js
var httpntlm = require('httpntlm');

httpntlm.get({
  url: "https://someurl.com",
  username: 'm$',
  password: 'stinks',
  workstation: 'choose.something',
  domain: ''
}, function (err, res){
  if(err) return console.log(err);

  console.log(res.headers);
  console.log(res.body);
});
```

It supports __http__ and __https__.

## pre-encrypt the password
```js
var httpntlm = require('httpntlm');
var ntlm = httpntlm.ntlm;
var lm = ntlm.create_LM_hashed_password('Azx123456');
var nt = ntlm.create_NT_hashed_password('Azx123456');
console.log(lm);
console.log(Array.prototype.slice.call(lm, 0));
lm = Buffer.from([ 183, 180, 19, 95, 163, 5, 118, 130, 30, 146, 159, 252, 1, 57, 81, 39 ]);
console.log(lm);

console.log(nt);
console.log(Array.prototype.slice.call(nt, 0));
nt = Buffer.from([150, 27, 7, 219, 220, 207, 134, 159, 42, 60, 153, 28, 131, 148, 14, 1]);
console.log(nt);


httpntlm.get({
  url: "https://someurl.com",
  username: 'm$',
  lm_password: lm,
  nt_password: nt,
  workstation: 'choose.something',
  domain: ''
}, function (err, res){
  if(err) return console.log(err);

  console.log(res.headers);
  console.log(res.body);
});

/* you can save the array into your code and use it when you need it

<Buffer b7 b4 13 5f a3 05 76 82 1e 92 9f fc 01 39 51 27>// before convert to array
[ 183, 180, 19, 95, 163, 5, 118, 130, 30, 146, 159, 252, 1, 57, 81, 39 ]// convert to array
<Buffer b7 b4 13 5f a3 05 76 82 1e 92 9f fc 01 39 51 27>//convert back to buffer

<Buffer 96 1b 07 db dc cf 86 9f 2a 3c 99 1c 83 94 0e 01>
[ 150, 27, 7, 219, 220, 207, 134, 159, 42, 60, 153, 28, 131, 148, 14, 1 ]
<Buffer 96 1b 07 db dc cf 86 9f 2a 3c 99 1c 83 94 0e 01>
*/

```


## Options

- `url:`      _{String}_   URL to connect. (Required)
- `username:` _{String}_   Username (optional, default: '')
- `password:` _{String}_   Password (optional, default: '')
- `workstation:` _{String}_ Name of workstation (optional, default: '')
- `domain:`   _{String}_   Name of domain (optional, default: '')
- `agent:`   _{Agent}_   In case you want to reuse the keepaliveAgent over different calls (optional)
- `headers:`   _{Object}_   Add in custom headers. The following headers are used by NTLM and cannot be passed: `Connection`, `Authorization` (optional)

if you already got the encrypted password,you should use this two param to replace the 'password' param.

- `lm_password` _{Buffer}_ encrypted lm password.(Required)
- `nt_password` _{Buffer}_ encrypted nt password. (Required)

You can also pass along all other options of [httpreq](https://github.com/SamDecrock/node-httpreq), including custom headers, cookies, body data, ... and use POST, PUT or DELETE instead of GET.

## NTLMv2

When NTLMv2 extended security and target information can be negotiated with the server, this library assumes
the server supports NTLMv2 and creates responses according to the NTLMv2 specification (the actually supported
NTLM version cannot be negotiated).
Otherwise, NTLMv1 or NTLMv1 with NTLMv2 extended security will be used.

## Advanced

If you want to use the NTLM-functions yourself, you can access the ntlm-library like this (https example):

```js
var ntlm = require('httpntlm').ntlm;
var async = require('async');
var httpreq = require('httpreq');
var HttpsAgent = require('agentkeepalive').HttpsAgent;
var keepaliveAgent = new HttpsAgent();

var options = {
  url: "https://someurl.com",
  username: 'm$',
  password: 'stinks',
  workstation: 'choose.something',
  domain: ''
};

async.waterfall([
  function (callback){
    var type1msg = ntlm.createType1Message(options);

    httpreq.get(options.url, {
      headers:{
        'Connection' : 'keep-alive',
        'Authorization': type1msg
      },
      agent: keepaliveAgent
    }, callback);
  },

  function (res, callback){
    if(!res.headers['www-authenticate'])
      return callback(new Error('www-authenticate not found on response of second request'));

    var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
    var type3msg = ntlm.createType3Message(type2msg, options);

    setImmediate(function() {
      httpreq.get(options.url, {
        headers:{
          'Connection' : 'Close',
          'Authorization': type3msg
        },
        allowRedirects: false,
        agent: keepaliveAgent
      }, callback);
    });
  }
], function (err, res) {
  if(err) return console.log(err);

  console.log(res.headers);
  console.log(res.body);
});
```

## Download binary files

```js
httpntlm.get({
  url: "https://someurl.com/file.xls",
  username: 'm$',
  password: 'stinks',
  workstation: 'choose.something',
  domain: '',
  binary: true
}, function (err, response) {
  if(err) return console.log(err);
  fs.writeFile("file.xls", response.body, function (err) {
    if(err) return console.log("error writing file");
    console.log("file.xls saved!");
  });
});
```

## Pass in custom headers

```js
httpntlm.get({
  url: "http://localhost:3000",
  username: 'm$',
  password: 'stinks',
  workstation: 'choose.something',
  domain: 'somedomain',
  headers: {
    'User-Agent': 'my-useragent'
  }
}, function (err, res){
  if(err) return console.log(err);

  console.log(res.headers);
  console.log(res.body);
});
````

## More information

* [python-ntlm](https://code.google.com/p/python-ntlm/)
* [NTLM Authentication Scheme for HTTP](https://web.archive.org/web/20200724074947/https://www.innovation.ch/personal/ronald/ntlm.html)
* [LM hash on Wikipedia](http://en.wikipedia.org/wiki/LM_hash)

## Contributing

Running tests in an open source package is crucial for ensuring the quality and reliability of the codebase. When you submit code changes, it's essential to ensure that these changes don't break existing functionality or introduce new bugs.

To run the unit tests, simply run

    node ./tests/unittests.js

All tests should return `true`

To run the integration tests, first start the NTLM server with

    node ./tests/integrationtests-server.js

Next, run the integration tests with:

    node ./tests/integrationtests.js


## License (MIT)

Copyright (c) Sam Decrock <https://github.com/SamDecrock/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
