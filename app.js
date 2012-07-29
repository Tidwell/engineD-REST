#!/usr/bin/env node

var perfectapi = require('perfectapi');
var mongojs = require('mongojs');
var path = require('path');

var configPath = path.resolve(__dirname, 'api.json');
var parser = new perfectapi.Parser();

var db = mongojs.connect('engineD', ['events']);
var ObjectId = mongojs.ObjectId;

parser.on('events',function(config,callback){
	var returnList = [];
	db.events.find().forEach(function(i,doc){
		if (!doc){ //all docs have been found
			callback(false,returnList);
			return;
		}
		returnList.push({
			id: doc._id,
			name: doc.name,
			startTime: doc.startTime
		});
	});
});

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
		startTime: config.options.startTime ? new Date(config.options.startTime) : null,
		comments: []
	},function(err,doc) {
		//send back
		callback(err, filter(doc));
	});
});

parser.on("event/get", function(config, callback) {
	var id = parseId(config.options.id);
	if (!id) {
		callback(true,{message: 'invalid id'});
	}
	//query the DB to find the event
	db.events.findOne({"_id": id},function(err,doc) {
		if (!doc) {
			callback(true, {message: 'invalid id'});
			return;
		}
		//all good, send back
		callback(false, filter(doc));
	});
});

parser.on("comment/add", function(config, callback) {
	var id = parseId(config.options.id);
	if (!id) {
		callback(true,{message: 'invalid id'});
		return;
	}
	if (!config.options.comment) {
		callback(true,{message: 'invalid comment'});
		return;
	}
	//set published to true if passed in as a string, otherwise false
	config.options.published = (config.options.published === 'true');
	//query the DB to find the event
	db.events.findOne({"_id": id},function(err,doc) {
		if (!doc) {
			callback(true, {message: 'invalid id'});
			return;
		}
		var newComment = {
			comment: config.options.comment,
			date: new Date(),
			author: config.options.author || null,
			published: config.options.published
		};
		//we have a valid document to add the comment to
		doc.comments.push(newComment);
		db.events.save(doc,function(err,doc){
			console.log(doc);
			callback(false,{message: 'success',comment: newComment});
		});
	});

});

//expose the api
module.exports = parser.parse(configPath);

function filter(doc) {
	doc.id = doc._id;
	delete doc._id;
	return doc;
}
function parseId(id) {
	//make sure they passed an id
	if (!id) {
		return false;
	}
	//try to parse it to a mongo ID
	try {
		id = ObjectId(id);
	} catch(err) {
		return false;
	}
	return id;
}