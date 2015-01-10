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
subScnls.port = 2112; //port browser connects to

var io = require('socket.io')(subScnls.port); //port connection for client
var sub = redis.createClient(subScnls.redisPort, subScnls.redisHost);
sub.subscribe(subScnls.key);//subscribe to Pub channel
io.on('connection', function(client){ 
  sub.on('message', function(channel, msg) {
    // console.log("from channel: " + channel + " msg: " + msg);
    console.log("msg.length: " + msg.length );
    client.send(msg);
  });
      
    client.on('disconnect', function() {
         //don't do this
        // sub.quit();
    });
  
});
