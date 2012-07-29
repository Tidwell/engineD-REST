#!/usr/bin/env node

var perfectapi = require('perfectapi');
var mongojs = require('mongojs');
var path = require('path');

var configPath = path.resolve(__dirname, 'api.json');
var parser = new perfectapi.Parser();

var db = mongojs.connect('engineD', ['events']);
var ObjectId = mongojs.ObjectId;

parser.on("event/create", function(config, callback) {
	var err = false;
	//make sure a name was provided
	if (!config.options.name) {
		callback(true,{message: 'name is required'});
		return;
	}
	//if a start time was provided, make sure it parses to a date
	if (config.options.startTime && new Date(config.options.startTime) == 'Invalid Date') {
		callback(true,{message: 'invalid startTime'});
		return;
	}
	//save it to the database
	db.events.save({
		name: config.options.name,
		startTime: config.options.startTime ? new Date(config.options.startTime) : null
	},function(err,doc) {
		//send back
		callback(err, filter(doc));
	});
});

parser.on("event/data", function(config, callback) {
	var err = false;
	var id = config.options.id;
	//make sure they passed an id
	if (!id) {
		callback(true,{message: 'id is required'});
		return;
	}
	//try to parse it to a mongo ID
	try {
		id = ObjectId(id);
	} catch(err) {
		callback(true,{message: 'invalid id'});
		return;
	}
	//query the DB to find the event
	db.events.findOne({"_id": id},function(err,doc) {
		if (!doc) {
			callback(true, {message: 'invalid id'});
			return;
		}
		//all good, send back
		callback(err, filter(doc));
	});
    
});

//expose the api
module.exports = parser.parse(configPath);

function filter(doc) {
	doc.id = doc._id;
	delete doc._id;
	return doc;
}