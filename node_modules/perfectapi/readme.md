Package Goal
------------
The goals of this package are to support:

 - Well-designed APIs
 - Simple usage of any API from any programming language
 - Full support for running an API as a service on Linux and Windows operating systems

Reasons to use PerfectAPI (Feature list)
-------------------------

 - You want to write a REST+JSON service in Node.js, or you want to make an existing Node.js package accessible as a service
 - Native Node.js access to an API - obviously!  This just means that you can use it as a normal Node.js `require` module or as a service in a separate process
 - Node.js proxy access to other PerfectAPIs.  It's just as easy to run the API locally or as a service on another server
 - Self-hosted server with simple comand-line - `myapp server -p 3002`
 - Windows and Linux installers (run your API as a true service on your server) - `myapp install myappservicename`
 - Automatic validation of required parameters
 - Command-line access to your API
 - JSONP interface to your API - that means you can access it using JavaScript from another domain
 - REST interface to your API
 - Native .NET client to your API - access from .NET without dealing with REST, JSON, WebRequest etc.
 - Javascript client (call your API directly from javascript using rpc - no Ajax, just a simple async call)
 - Awesomely amazing test page for your users to learn/experiment/test your API 

Reasons not to use PerfectAPI
-----------------------------

 - If your API is primarily a simple data access layer, then you may be better off using another library that specializes in data access.  
 - You want control over what your REST API looks like. (PerfectAPI sacrifices some of your design freedom in order to promote a consistent API model).

Install
-------
The usual for Node.js stuff

    $ npm install perfectapi

or for a global install:

    $ sudo npm install -g perfectapi

How to include in your API
--------------------------
First, create a `perfectapi.json` configuration file.  See [Configuration File](node-perfectapi/wiki/perfectapi-config-file-format) for details.   Once you have a configuration file, a sample usage is:

```
#!/usr/bin/env node

var perfectapi = require('perfectapi');  
var path = require('path');

var configPath = path.resolve(__dirname, 'perfectapi.json');
var parser = new perfectapi.Parser();

//handle the commands
parser.on("mycommand", function(config, callback) {
	//do mycommand code, putting results into "result" object

	//after done
	callback(err, result);
});
 
parser.on("anothercommand", function(config, callback) {
	//do anothercommand code, putting results into "result" object

	//after done
	callback(err, result);
});

//expose the api
module.exports = parser.parse(configPath);
```

In your `package.json` file, be sure to specify the above file as a "bin", so that the app can be called from the command-line, e.g.

```	
{ "name": "myNodeLib"
, "version": "0.0.1"
, "description": "My brilliant API"
, "main": "./bin/myNodeLib.js"
, "bin": "./bin/myNodeLib.js"
, "engines": {
    "node" : ">=0.6.5"
  }
, "dependencies": {
	"perfectapi": ">=0.0.13"
  }
}
```
Thats it.  

Usage from another Node app
---------------------------
Other node apps can use your library (e.g. `myNodeLib`).  This is exactly the same as you might access any other API, except that the function signature is always the same `(config, callback)` and the callback is also always the same `function(err, result)`.  `result` is a return object with the structure defined in the configuration.

```
var test1=require('myNodeLib');

var config = {}
test1.mycommand(config, function(err, result) {
	if (err) {
		console.log('something went wrong: ' + err);
	} else {
		console.log('output = ' + JSON.stringify(result));
	}
});
```

Usage from Javascript
---------------------
Assuming the service is running at http://myserver.com:3000/apis, code looks like below: 

```
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
<script src="//myserver.com:3000/apis/jquery.perfectapi.js"></script>

<script>
myNodeLib.callApi('myCommand', config, function(err, result) {
  ...do stuff
});
</script>
```

Usage from command-line
-----------------------

Examples:

```
$ myapp --help

  Usage: myapp [options] [command]

  Commands:

    gen [options] <scripts>
    Generates a new Amazon EC2 image using the supplied scripts

    scripts [options]
    Lists available scripts for use in gen

    server [options]
    Run this API as a REST + JSON server

  Options:

    -h, --help  output usage information
```
Several commands are added automatically - `server`, `install`, `uninstall`, `config`.

Focusing on just one of the commands:

```
$ myapp gen --help

  Usage: gen [options] <scripts>

  Options:

    -h, --help         output usage information
    -r, --root <root>  specify the root folder where scripts can be found
    -a, --ami [ami]    the AMI name that will form the basis of the new images
    -p, --publish      if set, the resulting AMI(s) will be made public
```

Usage via proxy in Node
-----------------------
This is for accessing other PerfectAPI interfaces from Node.js.   The API you are accessing could be written in any language, but is written using PerfectAPI, and hosted somewhere on the Internet.  The syntax is almost identical to the normal Node usage, with the following differences:

 - references a proxy endpoint (e.g. http://myserver.com:3000/apis) instead of the downloaded Node package
 - user code executes in a callback (because we have to wait for the endpoint to be validated and the proxy created)

```
var perfectapi = require('perfectapi');
perfectapi.proxy('http://myserver.com:3000/apis', function(err, test1) {

	var config = {}
	test1.mycommand(config, function(err, result) {
		if (err) {
			console.log('something went wrong: ' + err);
		} else {
			console.log('output = ' + JSON.stringify(result));
		}
	});
	
});
```

Usage from C# (.NET Framework 4.0 or higher)
-------------
When running as a service, the service endpoint exposes a C# client at `http://myserver.com/myapi/myapi.cs`.  You should downloaded that file (once) and incorporate it into your C# project.  You will need the following references in your project, and you will need to target .NET 4 or later:

 - System
 - System.Core
 - System.Runtime.Serialization
 - System.Web
 - System.Xml
 - System.Xml.Linq
 - Microsoft.CSharp
 
The following is an example of usage:

```
using System;
using PerfectAPI.Client;

namespace example
{
	class Program
	{
		public static void Main(string[] args)
		{
			var amigen = new Amigen();
			
			var config = new Amigen.GenConfig();
			config.Scripts = new string[] {@"ubuntu11.10\nodejs-stable"};
			config.Options.Root = @"E:\Code\ami-generator\scripts\";
			var result = amigen.Gen(config);
			
			Console.WriteLine(result.RawResult);
			Console.WriteLine(result.ParsedResult.ami);
			Console.WriteLine(result.ParsedResult.region);
			
			Console.Write("Press any key to continue . . . ");
			Console.ReadKey(true);
		}
	}
}
```

In the example above, the service name is `amigen` and the command being executed is `gen`.  The command accepts a parameter named `scripts` and has an option named `root`.  The results are available as raw JSON (`RawResult`) or as parsed JSON (`ParsedResult`).