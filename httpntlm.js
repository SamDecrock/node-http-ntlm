/**
 * Copyright (c) 2013 Sam Decrock https://github.com/SamDecrock/
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

exports.Promise = Promise;

var url = require('url');
var ntlm = require('./ntlm');
var http = require('http');
var https = require('https');
var Duplex = require('stream').Duplex;

var gFetchOrRequest = getGlobalFetchOrRequest();
var prototypeOf = (function(prototypeOf, o) {
  return o == undefined ? undefined : prototypeOf(o);
}).bind(null, Object.getPrototypeOf);
var functionPrototype = prototypeOf(function() {});
var stringPrototype = prototypeOf('');

/**
 * @typedef Options
 * @type {object}
 * @property {string} [method] - the http method e.g. post, get, put, delete... (optional only if using the method function).
 * @property {string} [url] - the url of the request e.g. http://www.google.com (optional ony if sent as a seperate parameter).
 * @property {any} [body] - the body of the request.
 * @property {object} [headers] - the headers of the request.
 * @property {string} [workstation=''] - the workstation.
 * @property {string} [domain=''] - the domain.
 * @property {string} username - the username.
 * @property {string} [password] - the password optional only if lm_password and nt_password are provided.
 * @property {string} [lm_password] - the lm_password optional only if password is provided.
 * @property {string} [nt_password] - the nt_password optional only if password is provided.
 * @property {string} [agent] - an http(s) agent to use SHOULD BE KEEPALIVE if none is provided i create a new one depending on protocol.
 * @property {{strict:boolean}} [ntlm] - an object with a strict property to indicate if the ntlm should be required (if not the response from first request will be sent back).
 * @property {string} [fetch] - a fetch module to use if node-fetch is installed as peer no need to provide this.
 * @property {string} [request] - a request module to use if request is installed as peer no need to provide this (note fetch is of higher priority).
 */

function omit(obj) {
  var toOmit = {}, i;
  for(i = 1; i < arguments.length; i++) {
    toOmit[arguments[i]] = true;
  }
  var ret = {};
  for(i in obj) {
    if(!toOmit[i]) {
      ret[i] = obj[i];
    }
  }
  return ret;
}

function getGlobalFetchOrRequest() {
  var unified;
  try {
    unified = require(process.env.HTTPNTLM_FETCH || 'node-fetch');
  }
  // eslint-disable-next-line no-empty
  catch(err) { }
  if(!unified) {
    unified = global.fetch;
  }
  if(unified) {
    return unifyFetch(unified);
  }

  try {
    unified = require(process.env.HTTPNTLM_REQUEST || 'request');
  }
  // eslint-disable-next-line no-empty
  catch(err) { }
  if(!unified) {
    unified = global.request;
  }
  if(unified) {
    return unifyRequest(unified);
  }
}

function unifyFetch(_fetch) { // useful for my purpose only
  return function fetch(options) {
    return _fetch(options.url, options);
  };
}
function unifyRequest(_request) { // useful for my purpose only
  return function request(options, hasCb) {
    return new exports.Promise(function(resolve, reject) {
      var ret;
      if(hasCb) {
        var cbResolve;
        var cbPromise = new exports.Promise(function(res) {
          cbResolve = res;
        });
        ret = _request(options, function() {
          cbResolve(Array.prototype.slice.call(arguments));
        });
        ret.__callback__promise__ = cbPromise;
      }
      else {
        ret = _request(options);
      }
      var ev = [];
      var getEventHandler = function(event) {
        return function() {
          ev.push([event].concat(Array.prototype.slice.call(arguments)));
        };
      };
      var eventHandlers = {
        end: getEventHandler('end'),
        request: getEventHandler('request'),
        data: getEventHandler('data'),
        complete: getEventHandler('complete'),
        pipe: getEventHandler('pipe'),
        socket: getEventHandler('socket'),
        error: getEventHandler('error'),
        response: getEventHandler('response'),
      };

      var unbind = function() {
        for(var i in eventHandlers) {
          ret.off(i, eventHandlers[i]);
        }
        return ev;
      };
      ret.__unbind__ = unbind;

      var errFunc, onResFunc;
      errFunc = function(err) {
        err.__parent__request__ = ret;
        reject(err);
      };
      onResFunc = function(response) {
        response.__parent__request__ = ret;
        resolve(response);
      };
      ret.once('error', errFunc);
      ret.once('response', onResFunc);
      for(var i in eventHandlers) {
        ret.on(i, eventHandlers[i]);
      }

    });
  };
}
function getFetchOrRequest(options) {
  return (options.fetch && unifyFetch(options.fetch)) || (options.request && unifyRequest(options.request)) || gFetchOrRequest;
}
function getAgent(options) {
  if(options.agent) {
    return options.agent;
  }
  var protocol = options.protocol || url.parse(options.url).protocol;
  return (protocol === 'https:') ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
}
function getHeader(headers, headerkey) {
  if(prototypeOf(headers.get) === functionPrototype) {
    return headers.get(headerkey);
  }
  return headers[headerkey];
}

function doCall(fetchOrRequest, options, hasCallback) {
  if(!options.workstation) options.workstation = '';
  if(!options.domain) options.domain = '';

  var keepaliveAgent = getAgent(options);
  
  // extract non-ntlm-options:
  var callOptions = omit(options, 'username', 'password', 'lm_password', 'nt_password', 'workstation', 'domain', 'agent', 'fetch', 'request');

  // build type1 request:
  function sendType1Message() {
    var type1msg = ntlm.createType1Message(options);

    var type1options = {
      headers:{
        'Connection' : 'keep-alive',
        'Authorization': type1msg
      },
      timeout: options.timeout || 0,
      agent: keepaliveAgent,
      allowRedirects: false // don't redirect in httpreq, because http could change to https which means we need to change the keepaliveAgent
    };

    // pass along other options:
    if(options.ntlm && options.ntlm.strict) {
      // strict no need to pass other parameters
      type1options = Object.assign({}, omit(callOptions, 'headers', 'body'), type1options);
    }
    else {
      // not strict pass other parameters so as to continue if everything passes
      type1options.headers = Object.assign({}, callOptions.headers, type1options.headers);
      type1options = Object.assign(type1options, omit(callOptions, 'headers', 'allowRedirects'));
    }

    // send type1 message to server:
    return fetchOrRequest(type1options, hasCallback);
  }

  function sendType3Message(type1Response) {
    return new exports.Promise(function(resolve, reject) {
      // catch redirect here:
      var redirectLocation = getHeader(type1Response.headers, 'location');
      if(redirectLocation) {
        return request(redirectLocation, options);
      }
  
      var wwwAuthHeader = getHeader(type1Response.headers, 'www-authenticate');
      if(!wwwAuthHeader) {
        if(options.ntlm && options.ntlm.strict) {
          reject(new Error('www-authenticate not found on response of second request'));
        }
        else {
          resolve(type1Response);
        }
      }
      else {
        // parse type2 message from server:
        var type2msg = ntlm.parseType2Message(wwwAuthHeader, reject); //callback only happens on errors
        if(!type2msg) return; // if callback returned an error, the parse-function returns with null
    
        // create type3 message:
        var type3msg = ntlm.createType3Message(type2msg, options);
    
        // build type3 request:
        var type3options = {
          headers: {
            'Connection': 'Close',
            'Authorization': type3msg
          },
          allowRedirects: false,
          agent: keepaliveAgent
        };
    
        // pass along other options:
        type3options.headers = Object.assign({}, callOptions.headers, type3options.headers);
        type3options = Object.assign(type3options, omit(callOptions, 'headers', 'allowRedirects'));
    
        // send type3 message to server:
        fetchOrRequest(type3options, hasCallback).then(resolve).catch(reject);
      }
    });
  }

  return sendType1Message()
  .then(function(type1Response) {
    return new exports.Promise(function(resolve) {
      setImmediate(resolve);
    })
    .then(function() {
      return sendType3Message(type1Response);
    });
  });
}

/**
 * method and url are optional, options is optional if method and url are provided
 * @param {string} method 
 * @param {string} url 
 * @param {Options} options 
 * @param {Function} [callback] 
 */
function method(method, url, options, callback) {
  if(prototypeOf(arguments[0]) === stringPrototype) {
    if(prototypeOf(arguments[1]) === stringPrototype) {
      if(prototypeOf(arguments[2]) === functionPrototype) {
        options = {};
        callback = arguments[2];
      }
    }
    else {
      url = undefined;
      options = arguments[1];
      callback = arguments[2];
    }
  }
  else {
    method = undefined;
    url = undefined;
    options = arguments[0];
    callback = arguments[1];
  }
  var opts = omit(options, 'url', 'uri');
  opts.method = method || opts.method;
  opts.url = url || options.url || options.uri;

  var fetchOrRequest = getFetchOrRequest(opts);
  var isRequest = fetchOrRequest.name !== 'fetch';

  var ret = doCall(fetchOrRequest, opts, !!callback)
  .then(function(response) {
    if(isRequest) {
      var req = response.__parent__request__;
      delete response.__parent__request__;
      if(callback) {
        req.__callback__promise__.then(function(args) {
          callback.apply(null, args);
        });
      }
      delete req.__callback__promise__;
      var unbind = req.__unbind__;
      delete req.__unbind__;
      return { request: req, response: response, unbind };
    }
    else if(callback) {
      callback(null, response);
    }
    return response;
  })
  .catch(function(err) {
    if(isRequest) {
      var req = err.__parent__request__;
      if(req) {
        delete err.__parent__request__;
        if(callback) {
          req.__callback__promise__.then(function(args) {
            callback.apply(null, args);
          });
        }
        delete req.__callback__promise__;
        var unbind = req.__unbind__;
        delete req.__unbind__;
        return { request: req, error: err, unbind };
      }
      else {
        if(callback) {
          callback(err);
        }
        return { error: err };
      }
    }
    if(callback) {
      callback(err);
    }
    return exports.Promise.reject(err);
  });
  if(isRequest) {
    var returnStream, req;
    var writes = [];
    returnStream = new Duplex({
      read: function() {
      },
      write: function() {
        var args = Array.prototype.slice.call(arguments);
        if(req) {
          req.write.apply(req, args);
        }
        else {
          writes.push(args);
        }
      }
    });
    
    ret.then(function(result) {
      req = result.request;
      if(req) {
        var i;
        for(i; i < writes.length; i++) {
          req.write.apply(req, writes[i]);
        }
  
        var events = result.unbind();
        var isComplete;
        for(i = 0; i < events.length; i++) {
          if(events[i][0] === 'complete') {
            isComplete = true;
          }
          returnStream.emit.apply(returnStream, events[i]);
        }
        if(!isComplete) {
          var getEventHandler = function(event) {
            return function() {
              returnStream.emit.apply(returnStream, [event].concat(Array.prototype.slice.call(arguments)));
              if(event === 'complete') {
                setTimeout(function() {
                  returnStream.destroy();
                }, 100);
              }
            };
          };
          var eventHandlers = {
            end: getEventHandler('end'),
            request: getEventHandler('request'),
            data: getEventHandler('data'),
            complete: getEventHandler('complete'),
            pipe: getEventHandler('pipe'),
            socket: getEventHandler('socket'),
            error: getEventHandler('error'),
            response: getEventHandler('response'),
          };
          for(i in eventHandlers) {
            req.on(i, eventHandlers[i]);
          }
        }
        else {
          setTimeout(function() {
            returnStream.destroy();
          }, 100);
        }
      }
      else {
        returnStream.emit('error', result.error);
        setImmediate(() => {
          returnStream.emit('complete', result.error);
        });
        setTimeout(function() {
          returnStream.destroy();
        }, 100);
      }
    });
    return returnStream;
  }
  return ret;
}
exports.method = method;

/**
 * @param {string} url 
 * @param {Options} options 
 * @param {Function} [callback] 
 */
function request(url, options, callback) {
  return method('', url, options, callback);
}
exports.request = request;
/**
 * @param {string} url 
 * @param {Options} options 
 * @param {Function} [callback] 
 */
function fetch(url, options, callback) {
  return method('', url, options, callback);
}
exports.fetch = fetch;

['get', 'put', 'patch', 'post', 'delete', 'options'].forEach(function(method) {
  exports[method] = exports.method.bind(exports, method);
});

exports.ntlm = ntlm; //if you want to use the NTML functions yourself

