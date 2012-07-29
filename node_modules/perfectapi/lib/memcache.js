var logger = require('winston').loggers.get('perfectapi');

var cache = {};

exports.set = function(key, val, ttlMilliseconds) {
	cache[key] = val;
	
	if (ttlMilliseconds) {
		//this does not account for the same key being used multiple times (BUG)
		setTimeout(function() {
			exports.remove(key);
		}, ttlMilliseconds)
	}
}

exports.get = function(key) {
	if (cache.hasOwnProperty(key)) {
		return cache[key];
	} else {
		console.verbose('cache miss key:')
		console.verbose(key);
	}
}

exports.remove = function(key) {
	if (cache.hasOwnProperty(key)) {
		logger.verbose('deleting ' + key + ' from cache - timed out');
		delete cache[key];
	}
}