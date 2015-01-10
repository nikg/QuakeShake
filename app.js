//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName, --redisHost=someRedisHost, --redisPort=redisport

var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');

/* inline config details */
var subScnls={};
subScnls.key = "hawks3Z";
//subScnls.redisHost = "localhost";
//subScnls.redisPort = 6379;
subScnls.redisHost = "products01.ess.washington.edu";
subScnls.redisPort = 32109;
subScnls.port = 8080; //socket.io port

var io = require('socket.io')(subScnls.port); //port connection for client
io.on('connection', function(client){ 
	var sub = redis.createClient(subScnls.redisPort, subScnls.redisHost);
	sub.subscribe(subScnls.key);//subscribe to Pub channel
	sub.on('message', function(channel, msg) {
		// console.log("from channel: " + channel + " msg: " + msg);
		console.log("msg.length: " + msg.length );
		client.send(msg);
	});

	// handle Redis 
	sub.on('connect'     , log('connect'));
	sub.on('reconnecting', log('reconnecting'));
	sub.on('error'       , log('error'));
	sub.on('end'         , log('end'));

	client.on('disconnect', function() {
	     //don't do this
	    // sub.quit();
	});

});

function log(type) {
    return function() {
        console.log(type, arguments);
    }
}