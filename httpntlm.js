var async = require('async');
var url = require('url');
var httpreq = require('httpreq');
var ntlm = require('./ntlm');

exports.method = function(method, options, callback){
	if(!options.workstation) options.workstation = '';
	if(!options.domain) options.domain = '';

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

			httpreq.get(options.url, {
				headers:{
					'Connection' : 'keep-alive',
					'Authorization': type1msg
				},
				agent: keepaliveAgent
			}, $);
		},

		function (res, $){
			if(!res.headers['www-authenticate'])
				return $(new Error('www-authenticate not found on response of second request'));

			var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
			var type3msg = ntlm.createType3Message(type2msg, options);

			options.headers = options.headers || {};
			options.body = options.body || '';

			options.headers['Connection'] = 'Close';
			options.headers['Authorization'] = type3msg;
			options.allowRedirects = false;
			options.agent = keepaliveAgent;

			httpreq[method](options.url, options, $);
		}
	], callback);
};

['get', 'put', 'post', 'delete', 'head'].forEach(function(method){
  exports[method] = exports.method.bind(exports, method);
});

exports.ntlm = ntlm; //if you want to use the NTML functions yourself
