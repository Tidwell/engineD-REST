/* 
 * Usage: 
 * 
 * var perfectapi = require('perfectapi');
 * var parser = new perfectapi.Parser();
 * 
 * parser.parse(pathToJsonConfig);
 * parser.on("mycommand", function(config, callback) {
 * 	 //do mycommand code, putting results into "result" object
 *   
 *   //after done
 *   callback(err, result);
 * });
*/

var cli=require("./lib/cligen.js");
var proxy=require("./lib/proxy.js");

exports.Parser = cli.Parser;
exports.proxy = proxy.proxy;