var path = require('path');
var express = require('express');
var cfg = require('./config.js');
var middleware = require('./connect.js');
var url = require('url');
var fs = require('fs');
var logger = require('winston').loggers.get('perfectapi');
var responder = require('./responder.js');
var util = require('util');

exports.listen = function listen(config, serverCommandConfig, callback) {
	var app = express.createServer();
	app.configure(function(){
		app.use(express.bodyParser());
		app.use(middleware.restify(config));
	});
  
  var commands = cfg.getCommands(config);	
	
  var csharpclient = (config.exports || 'api') + '.cs';
  logger.info('listening for c# client at /' + config.path + '/' + csharpclient);
	app.get('/' + config.path + '/' + csharpclient, function(req, res, next) {
		logger.verbose('Sending csharp client');

		var data = fs.readFileSync(path.resolve(__dirname, 'clients', 'csharp_template.cs'), 'utf8');
		var ejs = require('ejs');
    var options = {};
    options.apiName = config.exports || 'api';
    var url = 'http://' + req.headers.host + req.url;
    options.endPoint = url.replace(csharpclient, '');
    options.commandSpecs = commands;
    
		data = ejs.render(data, options);
    
    res.contentType('text/plain');
		res.send(data);
		res.end();
	}); 
  
	logger.info('listening for javascript client at /' + config.path + '/jquery.perfectapi.js');
	app.get('/' + config.path + '/jquery.perfectapi.js', function(req, res, next) {
		logger.verbose('Sending javascript');

		var data = fs.readFileSync(path.resolve(__dirname, 'clients', 'javascript_template.js'), 'utf8');
		data = data
			.replace(/perfectapi/g, config.exports || 'perfectapi')
			.replace(/localhost/g, req.headers.host)
			.replace('/rootapipath/', req.url.replace('jquery.perfectapi.js', ''))
		
		//todo: caching
		res.send(data);
		res.end();
	});
	
	logger.info('listening for test app on /' + config.path + '/testapp/');
	app.get('/' + config.path + '/testapp', function(req, res, next) {
		//special handling for the index file
		var testAppFolder = path.resolve(__dirname, '..', 'testapp');
		var fileToSend = path.resolve(testAppFolder, 'index.html');
		var data = fs.readFileSync(fileToSend, 'utf8');
		data = data.replace('//localhost:3000/jquery.perfectapi.js', '/' + config.path + '/jquery.perfectapi.js');
		
		res.end(data);
	});
	app.get('/' + config.path + '/testapp/:file(*)', function(req, res, next) {
		//serving css, js, etc
	  var file = req.params.file
		var testAppFolder = path.resolve(__dirname, '..', 'testapp');
		var fileToSend = path.resolve(testAppFolder, file);
		res.sendfile(fileToSend);
	});
	
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		if (!cmd.preventUseOnServer) {
			listenForCommand(config, app, cmd.path, cmd.verb, callback);
		}
	}

	var io = require('socket.io').listen(app);
	io.set('log level', 1);
	io.enable('browser client minification');
	io.enable('browser client etag');
	io.set('transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'])
	io.sockets.on('connection', function (socket) {
		logger.verbose('received websocket connection');
		socket.on('callbackPlease', function(uuid){
			//tell the responder about the socket and the uuid
			logger.verbose('received websocket callbackPlease reply for ' + uuid)
			responder.callbackPlease(socket, uuid);
		});
	});
	
	app.listen(serverCommandConfig.options.port);
	logger.info('Listening on port ' + serverCommandConfig.options.port);
	return app;
}

function listenForCommand(apiConfig, app, path, verb, callback) {
	logger.verbose('listening for ' + verb + ' to ' + path);
	verb = 'all';  //just listen for anything, JSONP does not do POST.
	app[verb](path, function(req, res) {
		handleCommand(apiConfig, req, res, callback);
	});
}

function handleCommand(apiConfig, req, res, callback) {
	if (!req.perfectapi) {
		logger.warn('bad request');
		res.contentType('text/html');
		res.end('Recieved request to, but did not contain any config data');
		return;
	}
	var config = req.perfectapi.config;
	var commandName = req.perfectapi.commandName;
	
	logger.verbose('Received command ' + commandName);
	
  if (req.perfectapi.errors != '') {
    //request failed validation - override the callback to just return an error
    callback = function(err, commandName, config, cb) { cb(req.perfectapi.errors, null); }
  }
	if (commandName == 'config') {
		//special case - send config to the client
		callback = function(err, commandName, config, cb) { cb(null, apiConfig); }
	}

  responder.respond(callback, commandName, config, req, res);
}
