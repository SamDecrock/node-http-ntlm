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
```

Currently only supports __https__

## More information

* [python-ntlm](https://code.google.com/p/python-ntlm/)
* [NTLM Authentication Scheme for HTTP](http://www.innovation.ch/personal/ronald/ntlm.html)
* [LM hash on Wikipedia](http://en.wikipedia.org/wiki/LM_hash)
