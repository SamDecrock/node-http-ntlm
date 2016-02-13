'use strict';

var async = require('async');
var url = require('url');
var httpreq = require('httpreq');
var ntlm = require('./ntlm');
var _ = require('underscore');

exports.method = function(method, options, callback){
	if(!options.workstation) options.workstation = '';
	if(!options.domain) options.domain = '';

	// extract non-ntlm-options:
	var httpreqOptions = _.omit(options, 'url', 'username', 'password', 'workstation', 'domain');

	// is https?
	var isHttps = false;
	var reqUrl = url.parse(options.url);
	if(reqUrl.protocol == 'https:') isHttps = true;

	// set keepaliveAgent (http or https):
	var keepaliveAgent;

	if(isHttps){
		var HttpsAgent = require('agentkeepalive').HttpsAgent;
		keepaliveAgent = new HttpsAgent();
	}else{
		var Agent = require('agentkeepalive');
		keepaliveAgent = new Agent();
	}

	async.waterfall([
		function ($){
			var type1msg = ntlm.createType1Message(options);

			// build type1 request:
			var type1options = {
				headers:{
					'Connection' : 'keep-alive',
					'Authorization': type1msg
				},
				timeout: options.timeout || 0,
				agent: keepaliveAgent
			};

			// pass along timeout and ca:
			if(httpreqOptions.timeout) type1options.timeout = httpreqOptions.timeout;
			if(httpreqOptions.ca) type1options.ca = httpreqOptions.ca;

			// send type1 message to server:
			httpreq.get(options.url, type1options, $);
		},

		function (res, $){
			if(!res.headers['www-authenticate'])
				return $(new Error('www-authenticate not found on response of second request'));

			// parse type2 message from server:
			var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);

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
			type3options.headers = _.extend(type3options.headers, httpreqOptions.headers);
			type3options = _.extend(type3options, _.omit(httpreqOptions, 'headers'));

			// send type3 message to server:
			httpreq[method](options.url, type3options, $);
		}
	], callback);
};

['get', 'put', 'post', 'delete'].forEach(function(method){
	exports[method] = exports.method.bind(exports, method);
});

exports.ntlm = ntlm; //if you want to use the NTML functions yourself

