var winston = require('winston');

if (typeof process.env['NODE_ENV'] == 'undefined' 
  || process.env['NODE_ENV'] == '' 
  || process.env['NODE_ENV'] == 'development') {
  winston.loggers.add('perfectapi', {
    console: {
      level: 'info',
      colorize: 'true'
    }
  });
} else {
  winston.loggers.add('perfectapi', {
    console: {
      level: 'warn',
      colorize: 'true'
    }
  });
}

var logger = winston.loggers.get('perfectapi');

var fs = require('fs');
var path = require('path');
var program = require('./commander.js');
var util = require('util');
var events = require('events');
var cfg = require('./config.js');
var server = require('./server.js');

//I don't understand really, but following example from 
//  http://elegantcode.com/2011/02/21/taking-baby-steps-with-node-js-implementing-events/
function Parser() {
    if(false === (this instanceof Parser)) {
        return new Parser();
    }

    events.EventEmitter.call(this);
}
util.inherits(Parser, events.EventEmitter);

/*
  parses the command line and raises an event when a command is called:
    - @eventName = name of the command that was requested
	- @configPath = path to the perfectapi.json file that specifies the commands and options
	- @callback = function to call once command has been completed
*/

Parser.prototype.parse = function(configPath) {
	var self = this;	
	var rawConfig = cfg.getConfigFromPath(configPath);
	var commands = cfg.getCommands(rawConfig);

	/*
	var packagePath = path.resolve(__dirname, '..', '..', 'package.json');
	var version = JSON.parse(fs.readFileSync(packagePath)).version; 
	program.version(version);
	*/
  
  program.on('*', function() {
    console.log('Use --help to see help\n');
  });
	
	for (var i=0;i<commands.length;i++) {
		var command = commands[i];
		var name = command.name;
		if (command.parameter) {
			var multi = (command.parameter.type=='multi') ? '..' : '';
			if (command.parameter.required) {
				name += ' <' + command.parameter.name + multi + '>';
			} else
				name += ' [' + command.parameter.name + multi + ']';
		} else {
			//name is sufficient
		}
		
		var cmd = program
			.command(name)
			.description(command.synopsis)
			.action(function() {
				//handle the command-line.  
				var options = arguments[arguments.length-1];   //full options object
				var commandName = options.name;

				var finalConfig = cfg.getDefaultConfig(rawConfig, commandName);
				var paramName = cfg.getCommandParameterName(rawConfig, commandName);
				if (paramName) 
					finalConfig[paramName] = arguments[0];
				finalConfig.options = cfg.merge(finalConfig.options, options);	//merge the parsed options into the standard perfectAPI options
				
				if (commandName=="server") {
					//special handling, we self-host the server and it intercepts the commands and emits them
					var app = server.listen(rawConfig, finalConfig, function(err, newCommandName, newConfig, finalCallback) {
						if (err) { 
							//not sure what to do here
							logger.error("Error: " + err);
						} else {
							self.emit(newCommandName, newConfig, finalCallback);
						}
					});
				} else if (commandName=="config") {
					//special handling, we return the config
					console.log(JSON.stringify(rawConfig));
				} else if (commandName=='install') {
					//special handling - do an install
					if (require('os').platform()=='win32') {
						logger.info('Windows install requested');
						require('./installwin32.js').install(finalConfig)
					} else {
						logger.info('Linux install requested');
						require('./installlinux.js').install(finalConfig);
					}
				} else if (commandName=='uninstall') {
					//special handling - do an uninstall
					if (require('os').platform()=='win32') {
						logger.info('Windows uninstall requested');
						require('./installwin32.js').uninstall(finalConfig)
					} else {
						logger.info('Linux uninstall requested');
						require('./installlinux.js').uninstall(finalConfig);
					}
				} 
        
        var fun = getCommandFunction(rawConfig, commandName, self);
        fun(finalConfig, function(err, result) {
          if (err) {
            logger.error("Error: " + err);
          } else {
            console.log(result);
          }        
        })

				
			});
		
		//setup commander.js options for this command:
		var options = command.options || [];
		for (var j=0;j<options.length;j++) {
			var option = options[j];
			if (option.option) {
				var optionText = '';
				if (option.short)
					optionText = '-' + option.short + ', ';
				optionText += '--' + (option.long || option.option);
				if (option.required)
					optionText += ' <' + option.option + '>'
				else
					optionText += ' [' + option.option + ']';
				
				if (option.default) 
					cmd.option(optionText, option.description, option.default);
				else
					cmd.option(optionText, option.description);
			} else if (option.flag) {
        
				var optionText = ''
        if (option.short) {
          optionText = '-' + option.short + ', --' + option.long;
        } else {
          optionText = '--' + option.long;
        }
        
				cmd.option(optionText, option.description);
			}
		}
	}

	program.parse(process.argv);
  if (process.argv.length == 2) return console.log(program.helpInformation());
	
	return initNativeAPI(rawConfig, self);	
}

exports.Parser = Parser;

function initNativeAPI(rawConfig, emitter) {
	//expose functions for each command
	//function commandName(config, callback)
	var commands = cfg.getCommands(rawConfig);
	var api = {}
	
	for(var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		var commandFunction = getCommandFunction(rawConfig, cmd.name, emitter)
		
		api[cmd.name] = commandFunction;
	}
	
	return api;
};

function getCommandFunction(rawConfig, commandName, emitter) {
	var commandFunction = function(config, callback) {
  
    logger.verbose('handling command ' + commandName);
    //stub callback to ensure we always return an Error object
    var cb = function(err, result) {
      if (err && !util.isError(err)) {
        err = new Error(err);
      }
      callback(err, result);
    }
    
		var finalConfig = cfg.getDefaultConfig(rawConfig, commandName);
		var paramName = cfg.getCommandParameterName(rawConfig, commandName);
		if (paramName) finalConfig[paramName] = config[paramName];
		finalConfig.options = cfg.merge(finalConfig.options, config.options);	//merge the parsed options into the standard perfectAPI options
    finalConfig.environment = cfg.merge(finalConfig.environment, config.environment);
    
    var commandSpec = cfg.getCommandByName(rawConfig, commandName);
    
    if (commandSpec.parameter
    && commandSpec.parameter.type 
    && commandSpec.parameter.type === 'file'
    && finalConfig[paramName]) {
      //handle file parameter
      var fileName = finalConfig[paramName];
      logger.info('Reading file ' + fileName);
      finalConfig[paramName] = getFile(fileName);
      if (commandSpec.parameter.required && finalConfig[paramName] === '') {
        return cb('File ' + fileName + ' not found');
      }
    }
    
    if (commandSpec.options) {
      commandSpec.options.forEach(function(option) {
        if (option.type 
        && option.type === 'file' 
        && finalConfig.options[option.option] != '') {
        
          var fileName = finalConfig.options[option.option];
          logger.info('Reading file ' + fileName);
          finalConfig.options[option.option] = getFile(fileName);
          if (option.required && finalConfig.options[option.option] === '') {
            return cb('File ' + fileName + ' not found');
          }
        }
      })
    }
    
    //emit event with config and callback
		emitter.emit(commandName, finalConfig, cb);
	}
	
	return commandFunction;
}

function getFile(fileName) {
  if (path.existsSync(fileName)) {
    return fs.readFileSync(fileName).toString('base64');
  } else {
    return '';
  }
  
}
