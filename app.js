var http    = require('http');
var redis   = require('redis');
var express = require('express');

// Local configuration
var subScnls={};
subScnls.key = "hawks3Z";
subScnls.redisHost = "products01.ess.washington.edu";
subScnls.redisPort = 32109;
subScnls.port = 8080;

// Initialize servers and application
var app = express();
app.use(express.static(__dirname + '/public')); // Change to /public in production
var server = http.createServer(app);
server.listen(process.env.PORT || subScnls.port); // Azure Web Sites sets env.PORT, otherwise use config
var io = require('socket.io')(server); // This attaches the websockets to the previously created server

// Initializes redis connection
var sub = redis.createClient(subScnls.redisPort, subScnls.redisHost);
sub.subscribe(subScnls.key);
sub.setMaxListeners(0);

// Global utility variables
var connectCounter = 0;
var allSocks = {};

// New websocket client
io.on('connection', function(client){
	client.qsid = connectCounter;
	allSocks[connectCounter] = client; // store socket in array object

	connectCounter++;
	console.log("[" + process.pid + "] ws client connected. total: " + connectCounter);

	client.on('disconnect', function() {
		delete allSocks[ws.id];
        	connectCounter--;
	        console.log("ws client disconnected.");
	});
});

// New redis message
sub.on('message', function(channel, msg) {
	console.log("[" + process.pid + "] msg.length: " + msg.length );
	for(var key in allSocks) {
		allSocks[key].send(msg);
		console.log("[" + process.pid + "] sent msg to socket " + allSocks[key].qsid);
	}
});

// A stub for handling other redis events in the future
sub.on('connect'     , log('connect'));
sub.on('reconnecting', log('reconnecting'));
sub.on('error'       , log('error'));
sub.on('end'         , log('end'));

function log(type) { // the redis modules like this instead of console.log()
    return function() {
        console.log(type, arguments);
    }
}
