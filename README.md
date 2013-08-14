node-http-ntlm
==============

Node.js module to authenticate using HTTP NTLM

Ported to JavaScript from python-ntlm: https://code.google.com/p/python-ntlm/

__How to use__

```js
var httpntlm = require('./httpntlm');

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