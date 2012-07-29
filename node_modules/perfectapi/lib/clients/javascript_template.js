/* Author: Steven Campbell

*/

var perfectapi = {};
perfectapi.host = document.location.protocol + '//localhost';
perfectapi.endpoint = perfectapi.host + '/rootapipath/';
var _papi = perfectapi;

jQuery(document).ready(function () {
	$.getScript(perfectapi.host + '/socket.io/socket.io.js', function(data, textStatus){
		//dynamically load socket.io javascript
		console.log('socket.io load was attempted - status = ' + textStatus);
	});
});

/* 
 * Browser offline detection starts ....
 * See also http://ednortonengineeringsociety.blogspot.com/2010/10/detecting-offline-status-in-html-5.html
*/
$(document).ready(function () {
	$(document.body).bind("online", checkNetworkStatus);
	$(document.body).bind("offline", checkNetworkStatus);
	checkNetworkStatus();
});

function checkNetworkStatus() {
	if (navigator.onLine) {
		refreshSockets(true);
	}
	else {
		refreshSockets(false);
	}
}

function refreshSockets(online) {
	if (online && !perfectapi.online) {
		//status changed to online, or first call
		perfectapi.online = true;
		
		if (perfectapi.socketUUID) {
			//we were waiting for a websocket callback when we went offline.  Lets try re-establish it
			startWebSocketConnection(perfectapi.socketUUID, perfectapi.socketCallback);
		}
	}
	else if (!online && perfectapi.online){
		//status changed to offline
		perfectapi.online = false;
	}

	console.log("Online status: " + online);
}
/* Offline detection ends */

perfectapi.callApi = function (command, config, callback) {
	if (config && typeof(config) === 'function') {
		callback = config;
		config = {};
	}
	if (!callback) callback = function() {};

	var url = perfectapi.endpoint + command;
	
	config.supportsSlowMode = true;			//tell the server we support slow mode (websocket) callbacks
	
	//jsonp
	$.ajax({
		dataType: 'jsonp',
		data: {"config": JSON.stringify(config)},		
		crossDomain: true,
		contentType: "application/json",
		accepts: "application/json", 
		url: url,				
		success: function(data) {
			console.log('success calling ' + command);
			console.log(data);
			
			if (data && data.slowMode) {
				console.log(command + ' is running in slow mode, opening websocket to ' + perfectapi.host);
				//switch to slowmode, initiate socket.io
				
				startWebSocketConnection(data.uuid, callback);
				
			} else {
				//respond now
				callback(null, data);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//never gets called for jsonp
		}
	});
}

function startWebSocketConnection(uuid, callback) {
	perfectapi.socketUUID = data.uuid;		//remember in case browser goes offline
	perfectapi.socketCallback = callback;

	if (perfectapi.socket) {
		//disconnect existing socket.  It is probably broken.
		perfectapi.socket.disconnect();
	}
	
	var socket = io.connect(perfectapi.host, {'force new connection': true});
	perfectapi.socket = socket;
	
	socket.emit('callbackPlease', uuid, function(err) {
		if (err) console.log(err);
	});
	console.log('requested callback on WebSocket using uuid ' + uuid);
	
	var gotCallback = false;
	socket.on('response', function(result, fn) {
		//got the callback from websocket!  
		fn('confirmed');  //server will disconnect the socket at this point
		
		perfectapi.socketUUID = null;
		perfectapi.socketCallback = null;   //forget these
		perfectapi.socket = null
		
		if (gotCallback) return;	//otherwise sometimes it gets called more than once
		
		gotCallback = true;
		console.log('Got slowmode callback from ' + command);
		console.log(result)
		callback(null, result);
		
		//socket.disconnect();
	});
	
	socket.on('reconnect_failed', function() {
		console.log('socket.io failed to auto-reconnect to server');
	});
}

/* 
 * Helper method for binding select lists
 * 
 *  selectObject - jQuery select object
 *  dataArray - array of data to bind into the list
 *  dataProperty - name of value property on data element.  Required for object arrays
 *  fnDisplay - optional, function that accepts a data element and returns a string to display for that element
 */
perfectapi.bindSelectList = function(selectObject, dataArray, dataProperty, fnDisplay) {
	if (!fnDisplay) {
		//default display = same as value saved
		fnDisplay = function(dataItem) {
			return dataItem[dataProperty];
		};
	}
	
	for(var i=0;i<dataArray.length;i++) {
		var data = dataArray[i];
		if (typeof(data) !== 'object') {
			//simpler case
			var option = '<option>' + data + '</option>';
			selectObject.append(option);			
		} else {
			//more complex, as data is an opject
			var option = '<option value="' + data[dataProperty] + '">' + fnDisplay(data) + '</option>';
			selectObject.append(option);			
		}
	}
}



