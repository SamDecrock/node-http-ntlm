# httpntlm

__httpntlm__ is a Node.js library to do HTTP NTLM authentication

It's a port from the Python libary [python-ntml](https://code.google.com/p/python-ntlm/)

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
    if(err) return err;

    console.log(res.headers);
    console.log(res.body);
});

httpntlm.post({
    url: "http://someotherurl.com",
    username: 'linux',
    password: 'rocks',
    workstation: 'choose.something',
    domain: '',
    headers: {
        'Content-Type': 'text/xml',
        'Some-Header': 'some.value'
    },
    body: message.body
}, function (err, res){
    if(err) return err;
    
    console.log(res.headers);
    console.log(res.body);
});
```

Should support __http__ and __https__ now. Though, I've not tested it on http.

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

        httpreq.get(options.url, {
            headers:{
                'Connection' : 'Close',
                'Authorization': type3msg
            },
            allowRedirects: false,
            agent: keepaliveAgent
        }, callback);
    }
], function (err, res) {
    if(err) return console.log(err);

    console.log(res.headers);
    console.log(res.body);
});
```
## More information

* [python-ntlm](https://code.google.com/p/python-ntlm/)
* [NTLM Authentication Scheme for HTTP](http://www.innovation.ch/personal/ronald/ntlm.html)
* [LM hash on Wikipedia](http://en.wikipedia.org/wiki/LM_hash)


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
