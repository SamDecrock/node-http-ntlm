var express = require('express');
var ntlm = require('express-ntlm');


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

app.all('*', function(request, response) {
  console.log('> incoming NTLM request');
  console.log('> headers:', request.headers);
  console.log('> ntlm data:', request.ntlm);

  response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
});

app.listen(3000, () => {
  console.log(`Listening on port 3000`);
});


