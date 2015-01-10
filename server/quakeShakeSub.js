//Subscription side of redis pub/sub
//To start get channel name for output of quakeShakePub
// node server/quakeShakeSub --channel=someChannelName, --redisHost=someRedisHost, --redisPort=redisport

var http = require('http');
// var sockjs = require('sockjs');
var redis = require('redis');

var ARGS={};
process.argv.forEach(function(val, index, array) {

  if(val.match(/=.*/i)){
    var keyVal = val.split("=");
    ARGS[keyVal[0]] = keyVal[1];
  }
});

if(ARGS['config']==null){
  console.log("You must supply config file as first arguement Usage:");
  console.log("Add config file to the config directory and name it [config]Sub.conf.js");
  console.log("node server/quakeShakeSub config=[config]");
  process.exit(1);
}

var SubScnls = require(__dirname + "/../config/" + ARGS['config'] +  "Sub.conf.js"); //unique conf file for this process

var subScnls = new SubScnls();
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