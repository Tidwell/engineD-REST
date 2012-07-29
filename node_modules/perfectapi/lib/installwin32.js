var path=require('path');
var fs = require('fs');
var logger = require('winston').loggers.get('perfectapi');

exports.install = function(config) {

	var moduleName = getRunningModule();
	
	var environment = "";
	var sep = ""
	for (var env in process.env) {
		var val = process.env[env]
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/\</g, '&lt;')
			.replace(/\>/g, '&gt;');
			
		environment = environment + sep + env + '=' + val;
		sep = ',';
	}
	//write service config
	var serviceExe = path.resolve(__dirname, 'installer', 'perfectapiWrapper.exe');
	var serviceConfig = path.resolve(__dirname, 'installer', 'perfectapiWrapper.exe.sampleconfig');
	var serviceConfigContent = fs.readFileSync(serviceConfig, 'utf8');
	serviceConfigContent = serviceConfigContent
		.replace('SampleNodeService', config.name)
		.replace('FullPathToNodeExe', process.execPath)
		.replace('FullPathToNodeJs', moduleName)
		.replace('NodeJsArgsValue', 'server -p ' + config.options.port)
		.replace('EnvVarSets', environment);
	serviceConfig = path.resolve(__dirname, 'installer', 'perfectapiWrapper.exe.config');
	fs.writeFileSync(serviceConfig, serviceConfigContent, 'utf8');

	//install
	var binPath = serviceExe

	logger.info('installing service with name ' + config.name);
	logger.info('bin path is ' + binPath);
	var exec = require('child_process').exec;
	var cmd = 'sc create "' + config.name + '" binPath= "' + binPath + '" start= auto';
	exec(cmd, function(err, stdout, stderr){
		if (err) {
			logger.error(err);
			return logger.error(stdout);
		}
		
		logger.verbose(stdout);
		
		cmd = 'sc start "' + config.name + '"';
		exec(cmd, function(err, stdout, stderr){
			if (err) {
				logger.error(err);
				return logger.error(stdout);
			}
			
			logger.verbose(stdout);
			
			console.log('Service installed');
		});
	});

	
};

exports.uninstall = function(config) {
	
	logger.info('uninstalling service ""' + config.name + '"');
	var exec = require('child_process').exec;
	var cmd = 'sc stop "' + config.name + '"';
	
	exec(cmd, function(err, stdout, stderr){
		if (err) {
			//no worries, we just stop it to be graceful
			logger.verbose(err);
		}
		
		logger.verbose(stdout);
		
		cmd = 'sc delete "' + config.name + '"';
		exec(cmd, function(err, stdout, stderr){
			if (err) {
				logger.error(err);
				return logger.error(stdout);
			}
			
			logger.verbose(stdout);
			
			console.log('Service uninstalled');
		});		
		
	});
};

function getRunningModule() {
	var currentModule = module;
	while (currentModule.parent)
		currentModule = currentModule.parent;
		
	return currentModule.filename;
}