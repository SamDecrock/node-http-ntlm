node-http-ntlm
==============

Node.js module to authenticate using HTTP NTLM

Ported to JavaScript from python-ntlm: https://code.google.com/p/python-ntlm/ (currently one of the hardest things I did, but I like the result)

## Install

You can install __httpntlm__ using the Node Package Manager (npm):

    npm install httpntlm

__How to use__

```js
var httpntlm = require('httpntlm');

httpntlm.get({
    url: "https://someurl.com",
    username: 'you',
    password: 'stink',
    workstation: 'choose.something',
    domain: ''
}, function (err, res){
    if(err) return err;

    console.log(res.headers);
    console.log(res.body);
});
```