var logger = require('winston').loggers.get('perfectapi');
var url = require('url');
var idgen = require('uuid-js');
var cache = require('./memcache.js'); //cache is used to communicate between functions in this module
var slowThreshold = 5000			//after how long do we call it slow and falback to socket.io
var slowTimeout = 1000*60*60*24;	 //max amount of time we will respond to slow calls
var slowRetryInterval = 200;			//trying to send a slow result but websocket not ready, wait x milliseconds and retry
var slowRetriesMax = 5000 / slowRetryInterval;		//don't retry after 5 seconds of retries
var chunkedTime = 9000			//number of milliseconds to wait before sending the next chunk on long responses.

exports.respond = function(commandCallback, commandName, config, req, res) {
	
	var gotCallback = false;
	var slowMode = false;
	var keepingAlive = false;
	var uuid = idgen.create().toString();
	
	//a little complex here...callbacks within callbacks...oh well.  At this point, we are still in our code.
	//the commandCallback here will cause an event to be emitted, and inside the caller's event handler code, they must
	//callback our own callback (alias="me") in order to send results to the browser.
	commandCallback(null, commandName, config, me=function(err, result) {
		if (gotCallback) return;   //no need to do anything, its done
		gotCallback = true;
		
		if (err) {
			//just pass back the err as part of the result
			result = result || {};
			result.err = err;
		} 
		
		var retry = function() {
			setTimeout(function() {
				gotCallback = false;	//reset else it will just exit
				
				var slowResult = cache.get(uuid);
				slowResult.retries = slowResult.retries || 0;
				slowResult.retries += 1;
				cache.set(uuid, slowResult, slowTimeout);
				
				me(err, result);		
			}, slowRetryInterval);
		}
		
		if (slowMode) {
			//original http request is gone.  Respond using websockets.
			var slowResult = cache.get(uuid);
			if (!slowResult) {
				//should only happen after slowTimeout exceeded or server restarted
				logger.warn('Could not respond to slow request - nothing found in the cache.');
			} else if (!(slowResult.socket)) {
				//this can be because of timing.  The client might still be establishing the websocket.	 Too many of these means
				//that slowThreshold is too low, or websockets is screwed up
				if (slowResult.retries > slowRetriesMax) {
					logger.error('Could not respond to slow request - socket not found in the cache.  max retries exceeded.');
				} else {
					logger.warn('Could not respond to slow request - socket not found in the cache.  retrying...');
					retry();
				}
			} else {
				//success!  send result back on the websocket
				slowResult.socket.emit('response', result, function(data) {
					if (data !== 'confirmed') {
						//client never received.  maybe the socket disconnected.  That's ok, we'll wait
						//and see if they reconnect - results are cahed up to slowTimeout milliseconds.
						//(client will have to reestablish a socket with same uuid).
						logger.warn('Unable to send result to socket.  Assuming client disconnected.');
					} else {
						logger.verbose('Sent back result in slow mode');
						slowResult.socket.disconnect();   //done with this websocket
					}
				});
			}
		} else {
			//still in original request-response cycle
			//logger.verbose('Sending back result in fast mode');
			sendResult(req, res, result);
		}
		
	});
	
	if (config.supportsSlowMode) {
		//force early response to client
		setTimeout(function() {
			if (gotCallback) return;   //no need to do anything, its done
			
			slowMode = true;		//switching to slow mode
			
			var result = {};
			result.slowMode = true;
			result.uuid = uuid;
			cache.set(uuid, result, slowTimeout)  

			sendResult(req, res, result);			//this instructs perfectapi.js client to initiate a websocket and wait for the response
		}, slowThreshold);
	} else {
		//make sure client does not disconnect
		var chunkedInterval = setInterval(function() {
			if (gotCallback) return;   //no need to do anything, its done

			if (!keepingAlive) {
				//send headers first time only
				res.contentType('application/json');
				res.setHeader('Transfer-Encoding', 'chunked');
			}
			keepingAlive = true

			//send some whitespace to keep the client interested
      logger.verbose('sending keepalive chunk');
			res.write(' ', 'utf8');
		}, chunkedTime);
	}
	
	function sendResult(req, res, result) {
		if (keepingAlive) {
			clearInterval(chunkedInterval);
		} else {
			res.contentType('application/json');
		}
		
    //logger.verbose('ending response with ' + JSON.stringify(result));
		if (url.parse(req.url, true).query.callback)
			res.end(req.query.callback + '(' + JSON.stringify(result) + ');')
		else
			res.end(JSON.stringify(result));
	}
}

exports.callbackPlease = function(socket, uuid) {
	var slowResult = cache.get(uuid);
	if (!slowResult) {
		//failed to find this in the cache.  screwed.
		logger.warn('Could not register slow callback - nothing found in the cache');
	} else {
		slowResult.socket = socket;
		cache.set(uuid, slowResult, slowTimeout);
	}	

}








