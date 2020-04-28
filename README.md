# httpntlm

__httpntlm__ is a Node.js library to do HTTP NTLM authentication

It's a port from the Python libary [python-ntml](https://code.google.com/p/python-ntlm/)

## Install

You can install __httpntlm__ using the Node Package Manager (npm):

    npm install httpntlm-maa

## How to use

```js
var httpntlm = require('httpntlm-maa');

// httpntlm.Promise = require('bluebird'); // specify your favourite promise library to use

var ret = httpntlm.fetch('https://someurl.com', {
    method: 'get',
    username: 'm$',
    password: 'stinks',
    workstation: 'choose.something',
    domain: '',
    ntlm: { strict: true },
    [fetch: <a_fetch_library>,] // for promise based
    [request: <a_request_library>]  // for stream based
}[, callback]);

// case fetch is provided or node-fetch module is peer installed the return is promise:
ret.then(function(response) {
  console.log('Success');
  return response;
})
.catch(function(error) {
  console.error('an error have occured', error);
});

// case request is provided or request module peer installed the return is a stream in that case:
ret.pipe(fs.createWriteStream('some-file.txt'));  // YAY piping works again!!!

or

httpntlm.fetch(options[, callback])
httpntlm.request(url, options[, callback])
httpntlm.request(options[, callback])
httpntlm.method(method, options[, callback])
httpntlm.method(method, url, options[, callback])
httpntlm.get(url, options[, callback])
httpntlm.get(options[, callback])
httpntlm.post...
```

NOTE: return is dependent on which module you use (fetch -> Promise, request -> Stream)
NOTE: the httpntlm.fetch and httpntlm.request are just aliases so httpntlm.fetch will use request if request is provided in the options argument same goes for httpntlm.request id fetch is provided in options.

It supports __http__ and __https__.

## pre-encrypt the password
```js

var httpntlm = require('httpntlm-maa');
var ntlm = httpntlm.ntlm;
var lm = ntlm.create_LM_hashed_password('Azx123456');
var nt = ntlm.create_NT_hashed_password('Azx123456');
console.log(lm);
console.log(Array.prototype.slice.call(lm, 0));
lm = new Buffer([ 183, 180, 19, 95, 163, 5, 118, 130, 30, 146, 159, 252, 1, 57, 81, 39 ]);
console.log(lm);

console.log(nt);
console.log(Array.prototype.slice.call(nt, 0));
nt = new Buffer([150, 27, 7, 219, 220, 207, 134, 159, 42, 60, 153, 28, 131, 148, 14, 1]);
console.log(nt);


httpntlm.get({
    url: "https://someurl.com",
    username: 'm$',
    lm_password: lm,
    nt_password: nt,
    workstation: 'choose.something',
    domain: '',
    ntlm: { strict: false }
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
- `username:` _{String}_   Username. (Required)
- `password:` _{String}_   Password. (Required)
- `workstation:` _{String}_ Name of workstation or `''`.
- `domain:`   _{String}_   Name of domain or `''`.
- `ntlm`: _{Object}_ [Optional] with boolean property strict
- `fetch:`   _{Function}_   a fetch module like node-fetch.
- `request:`   _{Function}_   a request module like request.

if you already got the encrypted password,you should use this two param to replace the 'password' param.

- `lm_password` _{Buffer}_ encrypted lm password.(Required)
- `nt_password` _{Buffer}_ encrypted nt password. (Required)

You can also pass along all other options of respective fetch or request modules, including custom headers, cookies, body data, ... and use POST, PUT or DELETE instead of GET.




## Advanced

If you want to use the NTLM-functions yourself, you can access the ntlm-library like this (https example):

```js
var ntlm = require('httpntlm-maa').ntlm;
var async = require('async');
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
    function(callback) {
        var type1msg = ntlm.createType1Message(options);

        fetch(options.url, {
            method: 'get',
            headers: {
                'Connection' : 'keep-alive',
                'Authorization': type1msg
            },
            agent: keepaliveAgent
        }, callback);
    },

    function(res, callback) {
        if(!res.headers['www-authenticate'])
            return callback(new Error('www-authenticate not found on response of second request'));

        var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
        var type3msg = ntlm.createType3Message(type2msg, options);

        setImmediate(function() {
            fetch(options.url, {
                method: 'get',
                headers: {
                    'Connection' : 'Close',
                    'Authorization': type3msg
                },
                allowRedirects: false,
                agent: keepaliveAgent
            }, callback);
        });
    }
], function(err, res) {
    if(err) return console.log(err);

    console.log(res.headers);
    console.log(res.body);
});
```

## Download binary files

it depends on the fetch/request module you are using like for request module set encoding to null in the options and for fetch use the .buffer() on the response object

## More information

* [python-ntlm](https://code.google.com/p/python-ntlm/)
* [NTLM Authentication Scheme for HTTP](http://www.innovation.ch/personal/ronald/ntlm.html)
* [LM hash on Wikipedia](http://en.wikipedia.org/wiki/LM_hash)

## Donate

If you like this module or you want me to update it faster, feel free to donate. It helps increasing my dedication to fixing bugs :-)

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LPYD83FGC7XPW)


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
