var async = require('async');
var httpreq = require('httpreq');
var ntlm = require('./ntlm');
var HttpsAgent = require('agentkeepalive').HttpsAgent;
var keepaliveAgent = new HttpsAgent();

exports.get = function(options, callback){
	if(!options.workstation) options.workstation = '';
	if(!options.domain) options.domain = '';

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

			httpreq.get(options.url, {
				headers:{
					'Connection' : 'Close',
					'Authorization': type3msg
				},
				allowRedirects: false,
				agent: keepaliveAgent
			}, $);
		}
	], callback);
}

