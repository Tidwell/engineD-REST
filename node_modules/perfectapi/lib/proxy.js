/*
 * PerfectAPI Node proxy generator - reads a configuration from a remote server, and
 * creates a proxy that can be used to natively call that API.
 *
*/

var http=require('http');
var cfg=require('./config.js');
var url=require('url');
var logger = require('winston').loggers.get('perfectapi');
var request = require('request');

exports.proxy = function(proxyUrl, callback) {
	var parsedUrl = url.parse(proxyUrl);
	
	var httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || 80,
		path: parsedUrl.pathname + "/config",
		headers: {'Content-Type': 'application/json', "Accepts":"*/*", "User-Agent":"PerfectAPI"},
		agent: false
	};
	
	logger.verbose('starting request for config');
	
	req = http.request(httpOptions, function(res) {
		//expect a JSON response with raw config in it (pretty much the json file).
		logger.verbose('requesting config');
		var configString = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			logger.silly('got some data');
			configString += chunk;
		});
		res.on('end', function() {
			logger.verbose('receieved config: ' + configString);
			//we have final config string
			var config = JSON.parse(configString);
			
			//what to do with it?  Read it, and export its endpoints as functions
			var api = exportConfigAsFunctions(config, proxyUrl);
			logger.verbose("API: " + JSON.stringify(api));
			callback(null, api);
		});
	});
	
	
	req.on('error', function(e) {
		logger.error('problem with request for config: ' + e.message + "\nfull error was: " + JSON.stringify(e) );
		//console.log('options were ' + JSON.stringify(httpOptions));
		callback(e);
	});
	
	req.end();
};

/*
	We're aiming for usage like this:

	var gen = require('perfectapi').proxy('http://www.perfectapi.com/amigen/api/');

	var config = {   
			"root": "./node_modules/amigen/scripts"
		,   "baseAMI": "ami-a562a9cc"
		,   "scripts": ["ubuntu11.10/AWS_API_tools", "ubuntu11.10/nodejs-latest"]
		};

	gen.getImageUsingConfig(config, function(err, amiId) {
		if (err) {
			console.log(err);
		} else {
			console.log('ok, done - amiId = ' + amiId);
		}
	});
*/


function exportConfigAsFunctions(config, proxyUrl) {
	var commands = cfg.getCommands(config);
	var api = {};
	
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		logger.verbose('Exposing proxy for ' + cmd.name);
		api[cmd.name] = exportCommandAsFunction(config, cmd, proxyUrl);
	}
	
	return api;
}

function exportCommandAsFunction(config, commandSpec, proxyUrl) {
	var fn = function(config, fncallback) {
		
		logger.verbose('proxy command ' + commandSpec.name + ' has been called');
    var href = proxyUrl + '/' + commandSpec.name;
    
    if (config && commandSpec.verb == 'GET') {
      //we have to url-encode the parameters and options

      if (commandSpec.parameter) {
        var paramVal = config[commandSpec.parameter.name];
        if (commandSpec.parameter.type && commandSpec.parameter.type == 'multi') {
          for (var i=0;i<paramVal.length;i++) {
            href += '&' + commandSpec.parameter.name + '=' + encodeURI(paramVal[i]);
          }
        } else {
          href += '&' + commandSpec.parameter.name + '=' + encodeURI(paramVal);
        }
      }
      
      if (config.options) {
        //append options
        for (var opt in config.options) {
          href += '&' + opt + '=' + encodeURI(config.options[opt]);
        }
      }

      href = href.replace('&', '?');  //replace first ampersand
    }
      
    var reqOptions = {url: href, 
      method: commandSpec.verb,
      json: true,
      encoding: 'utf8',
      headers: {"Accepts":"*/*", "User-Agent":"PerfectAPI" },
      body: config
    };

    if (config.environment) {
      //append environment to headers
      for (var env in config.environment) {
        reqOptions.headers[env] = config.environment[env]
      }
    }

    request(reqOptions, function(err, res) {
      var result = res.body;
      
      var err = (result && result.err) ? result.err : null;   //ensure err passed back correctly.
      fncallback(err, result);
    })
    
    return;
    
	};

	return fn;
}