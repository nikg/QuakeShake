//client side of quakeShake 
$(function(){  
  var canvas = new Canvas();
var channels = [
    new Scnl({
    sta: "HWK1",  
    chan: "HNZ", 
    net: "UW", 
    loc: "--", 
    max: null,
    position: 0, //from top 0 is highest
    lineColor: canvas.colors.shBlue
  }),
      new Scnl({
      sta: "HWK2",  
      chan: "HNZ", 
      net: "UW", 
      loc: "--", 
      max: null,
      position: 1, //from top 0 is highest
      lineColor: canvas.colors.shGreen
    }),
      new Scnl({
      sta: "HWK3",  
      chan: "HNZ", 
      net: "UW", 
      loc: "--", 
      max: null,
      position: 2, //from top 0 is highest
      lineColor: canvas.colors.shDarkBlue
    })
];
   $("#playback-slider").slider({
     slide: function(e, ui){canvas.selectPlayback(e, ui);}
   });
  
   $("#zoom-slider").slider({
     min: -1, //logs
     max: 3,
     step: .05,
     slide: function(e, ui){canvas.selectScale(e, ui);}
   });


  
  //every sample rate(pixel) redraw

$("#button-play").click(function(){
  canvas.playScroll();
  return false;
});

$("#button-stop").click(function(){
  canvas.pauseScroll();
  return false;
});

$("#button-realtime").click(function(){
  canvas.realtime=true;
  return false;
});
  
//websocket stuff

  var socket = io('http://realtime.pnsn.org/');
  
  socket.on('connect', function(data){
    // setStatus('connected');
    // socket.emit('subscribe', {channel: "worm:RS:EHZ:UW:--"});
  });

  socket.on('reconnecting', function(data){
    setStatus('reconnecting');
  });

  socket.on('message', function (message) {
      var data = JSON.parse(message);
      canvas.updateBuffer(data);
  });
  
  //end socket stuff

 
  // the buf is initialized with a length = canvas.width
  // incoming data are appended to buf
  // drawing is done from left to right (old to new)
  function Scnl(scnl){
    //this.buf = [];
    this.sta = scnl.sta;
    this.chan = scnl.chan;
    this.net = scnl.net;
    this.loc = scnl.loc;
    var loc = (!this.loc || this.loc == "--" || this.loc =="") ?  "" : ("_" + this.loc);
    this.key =  this.sta.toLowerCase() + "_" + this.chan.toLowerCase() + "_" + this.net.toLowerCase() + loc;
    this.lineColor =  scnl.lineColor;
    this.position = scnl.position;
  }
  
  //buffer will be of form:
  
  //  {
  //    milliseconds: {
  //      chan1: val,
  //      chan2: val,
  //      ....
  //      chanN: val
  //  }
  //        ....
  //}
  
  //initial params that should be consistent across all channels on page
  function Canvas(){
    this.pixPerSec         = 10;  //10 pix/sec = samples second i.e. the highest resolution we can display
    this.timeWindowSec  = 90;
    this.timeStep = 1000/this.pixPerSec;
    this.channelHeight  = 200; //how many pix for each signal
    this.height         = null;
    this.width          = this.timeWindowSec*this.pixPerSec;
    this.buffer         = null;
    this.axisColor      = "#000";
		this.lineWidth      = 1;
		this.tickInterval   = 10*1000;
    this.starttime      = Date.now()*1000; //make these real big and real small so they will be immediately overwritten
    this.endtime        = 0;
    this.colors         =  {
                            shBlue: '#2A5980',
  	                        shGreen: '#5CBD59',
  	                        shDarkBlue: "#061830"
                          };
    this.startPixOffset = this.width; //starttime pixelOffset
    this.lastTimeFrame= null; // track the time of the last time frame(left side of canvas this will be incremented each interval)
    this.canvasElement = document.getElementById("quakeShake");
    this.localTime = true;
    this.scale = 1; 
    this.realtime = true; //realtime will fast forward if tail of buffer gets too long.
    this.scroll = null; //sets scrolling
  };
  
  
  //called when new data arrive. Funciton independently from 
  // drawSignal method which is called on a sampRate interval
  Canvas.prototype.updateBuffer = function(packet){
     //we want to be writting new data just inside of canvas left
    if(this.lastTimeFrame == null){
      this.lastTimeFrame = this.makeTimeKey(packet.starttime);
    
      this.startPixOffset -=(this.pixPerSec*4);
    
      //400 for each channel + 20 pix for top and bottom time line plus 2px margin
      this.height = channels.length*this.channelHeight + 44; 
      this.canvasElement.height = this.height;
      this.canvasElement.width = this.width;
      
    }
    
    
    
    if(this.buffer == null)
      this.buffer = {};
    //update times to track oldest and youngest data points
    if(packet.starttime < this.starttime)
      this.starttime = this.makeTimeKey(packet.starttime);
    if(packet.endtime > this.endtime)
      this.endtime = this.makeTimeKey(packet.endtime);
    //decimate data
    this.updatePlaybackSlider();
    var _decimate = packet.samprate/this.pixPerSec;
    var _i = 0;
    var _t = packet.starttime;
    // this.buffer[this.makeTimeKey(_t)][this.makeChanKey(packet)] = packet.data[_i];
    while(_i < packet.data.length){
      var _index = Math.round(_i+= _decimate);
      if(_index < packet.data.length){
        if(!this.buffer[this.makeTimeKey(_t)]){
          this.buffer[this.makeTimeKey(_t)] ={};
        }
        this.buffer[this.makeTimeKey(_t)][this.makeChanKey(packet)] = packet.data[_index];
        _t+=this.timeStep; 
        
      }
    } 
  };
  

  
  Canvas.prototype.drawSignal = function(){
    if(this.scroll){
      //OFFSET at start
      if(this.startPixOffset >  0){
        this.startPixOffset--;
      }else{
        this.lastTimeFrame += this.timeStep;
      }
      
      //ADJUST PLAYwe need to adjust play if data on end of buffer tails off canvas
      //ideally we want new data written on canvas at about 10 seconds in 
      if(this.realtime){
        var tail = parseInt(((this.endtime - this.lastTimeFrame)/1000 * this.pixPerSec) - this.width + this.startPixOffset, 0);
        var pad = 0;
        if(tail > -50 && tail < 20)
          pad =2;
        if(tail > 20)
          pad = 4;
        if(tail > 100)
          pad =9;
        if(tail > 1000)
          pad=99;
        if(tail > 10000)
          pad=9999;
          //need to adjust these two values if we added padding
        this.lastTimeFrame += pad*this.timeStep;
        this.startPixOffset = Math.max(0,   this.startPixOffset -pad);
      }
    
      //PRUNE the buffer at 6 canvas widths by three canvas widths
      if(((this.endtime - this.starttime)/1000)*this.pixPerSec > 6*this.width){
        var time= this.starttime;
        while(time < this.starttime + 3*this.timeWindowSec*1000){          
          delete this.buffer[time];
          time+=this.timeStep; 
        }
        this.starttime = time;
      }
    }
    
    
    // FIND MEAN AND Extreme vals
    var start = this.lastTimeFrame;
	  var stop = this.lastTimeFrame + this.timeWindowSec*1000;
	  if(start < stop){
	    var ctx = this.canvasElement.getContext("2d");
      ctx.clearRect( 0, 0, this.width, this.height );
  		ctx.lineWidth = this.lineWidth;
      this.drawAxes(ctx);
  		ctx.beginPath();
      
      //iterate through all channels and draw
      for(var i=0; i< channels.length; i++){
        var channel = channels[i];
        start = this.lastTimeFrame;
      
        //find mean and max
        var sum=0;
        var min  = Number.MAX_VALUE;
        var max = -Number.MAX_VALUE;
        //use full array for ave an max
        var starttime = this.starttime;
        var count =0;
        while(starttime <= this.endtime){
          if(this.buffer[starttime] && this.buffer[starttime][channel.key]){
            var val = this.buffer[starttime][channel.key];
            sum+=val;
            max = val > max ? val : max;
            min = val < min ? val :min;
            count++;
            
          }
          starttime+=this.timeStep;
        }
        var mean = parseInt(sum/count,0);
        
        //switch vals if min is further from center
        if(Math.abs(max - mean) < Math.abs(min - mean)){
          max = min; 
        }
        // //this.scale is default 1 and adjusted by zoom slider
          max = parseInt(Math.abs(max -mean)*this.scale,0);
        ///FIXME
        // max = 1;
        
        //FIXME Debugging
        $("#status").text("Pad by " + pad + ", tail:" + tail + ", bufferLength: " + count );
        var s = channel.sta.toLowerCase();
        $("#status-" + s).text(s+ ":" +  " mean: " + mean + ", max: " + max + ", min:" + min + ", sum: " + sum  );        
      
        
    		ctx.strokeStyle = channel.lineColor;
    
    
    		//Draw!! from left to write
    		//if startPixOffset > 0 , this is offset, start drawing there
    		//this is only the case while plot first renders till it reaches left side of canvas
    	  var canvasIndex = this.startPixOffset;
    	  //boolean to use moveTo or lineTo
    	  // first time through we want to use moveTo
    	  var gap = true;
    	  // draw Always start from lastTimeFrame and go one canvas width
    	  count = 0;
        
        while(start <= stop){
          if(this.buffer[start] && this.buffer[start][channel.key]){
            var val = this.buffer[start][channel.key];
            var norm = ((val - mean) / max ); 
            if(norm < -1)
              norm = -1;
            if(norm > 1)
              norm = 1;
            var chanAxis = 22 + (this.channelHeight/2) + this.channelHeight*channel.position; //22 is offset for header timeline.
            var yval= Math.round( (this.channelHeight) / 2 * norm + chanAxis);
            if(gap){
              ctx.moveTo( canvasIndex, yval);
              gap =false;
            }else{
              ctx.lineTo(canvasIndex, yval);            
            }
          }else{
            gap = true;
          }
          canvasIndex++;
          start+= this.timeStep;
        
        }//while
        ctx.stroke();
      
      }
    }
  };
  
  //make a key based on new samprate that zeros out the insignificant digits. 
  Canvas.prototype.makeTimeKey = function(t){
    return parseInt(t/this.timeStep,0)*this.timeStep;
  };


  Canvas.prototype.makeChanKey = function(packet){
    //remove the dashes that are the default for loc = null
    var loc = (!packet.loc || packet.loc == "--" || this.loc =="") ?  "" : ("_" + packet.loc);
    return  packet.sta.toLowerCase() + "_" + packet.chan.toLowerCase() + "_" + packet.net.toLowerCase()  + loc;
  };
  
  
  Canvas.prototype.drawAxes = function(ctx){
    //some axis lines
    ctx.beginPath();
    //x-axes
    ctx.moveTo(0, 20); //top
    ctx.lineTo(this.width, 20);
    ctx.moveTo(0, this.height - 20); //bottom
    ctx.lineTo(this.width, this.height - 20);

    //y-axes
    
    ctx.moveTo(0,20 );// left
    ctx.lineTo(0, this.height -20);
    ctx.moveTo(this.width, 20 );//right
    ctx.lineTo(this.width, this.height -20);
    
    //scnl label
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.strokeStyle = this.axisColor;      
    ctx.stroke();
    
    
    ctx.beginPath();
    //channel center lines and labels:
    for(var i=0; i< channels.length; i++){
      var channel = channels[i];
      var yOffset= channel.position*this.channelHeight; 
      ctx.fillText(channel.sta, 10, 40+ yOffset);
      var chanCenter = 22 + this.channelHeight/2 +yOffset;      
      ctx.moveTo(0,  chanCenter);
      ctx.lineTo(this.width, chanCenter);
    }
    ctx.strokeStyle = "#CCCCCC";
    ctx.stroke();
    //end axis
    
    
    //plot a tick and time at all tickIntervals
    ctx.beginPath();
    ctx.font = "12px Helvetica, Arial, sans-serif";
    
    //centerline
    
    var offset = this.lastTimeFrame%this.tickInterval;  //should be number between 0 & 9999 for 10 second ticks
    //what is time of first tick to left  of startPixOffset
    var tickTime = this.lastTimeFrame - offset;
    
    var canvasIndex = this.startPixOffset - offset/this.timeStep;
    var pixInterval = this.tickInterval/this.timeStep;
    while(canvasIndex < this.width + 20){ //allow times to be drawn off of canvas
      // ctx.moveTo(canvasIndex, this.height -19);
      ctx.moveTo(canvasIndex, 20);
      ctx.lineTo(canvasIndex, this.height - 15);
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, 12); //top
      ctx.fillText(this.dateFormat(tickTime), canvasIndex - 23, this.height -1); //bottom
      canvasIndex+= pixInterval;
      tickTime+=this.tickInterval;
    }
    ctx.strokeStyle = "#CCCCCC";
    ctx.stroke();
    
    
		
  };
  
  //accept milliseconds and return data string of format HH:MM:SS in UTC or local
  Canvas.prototype.dateFormat = function(milliseconds){
    var d = new Date(milliseconds);
    if(this.localTime){
      var hours =  d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
    }else{
      var hours =  d.getUTCHours();
      var minutes = d.getUTCMinutes();
      var seconds = d.getUTCSeconds();
    }
    if(hours < 10)
     hours = "0" + hours;
    if(minutes < 10)
      minutes = "0" + minutes;
    if(seconds < 10)
      seconds = "0" + seconds;
    return hours + ":" + minutes + ":" + seconds;
  };
  
  
  //playback slider
  Canvas.prototype.updatePlaybackSlider=function(){
    $("#playback-slider" ).slider( "option", "max", this.endtime);
    $("#playback-slider").slider( "option", "min", this.starttime);
    if(this.scroll){
      $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
    }
    // $("#sliderLeft").text(this.dateFormat(this.starttime));
    // $("#sliderRight").text(this.dateFormat(this.lastTimeFrame));
    // $("#sliderMid").text(this.dateFormat($("#playback-slider").slider( "option", "value")));
    
  
   };
  
  Canvas.prototype.pauseScroll = function(){
    clearInterval(this.scroll);
    this.scroll = null;
    //take things out of realtime mode once scroll is stopped
    this.realtime = false;
  };
  
  
  Canvas.prototype.playScroll = function(){
      _this = this;
      this.scroll = setInterval(function(){
        if(_this.buffer != null){
          _this.drawSignal();
        }
      }, 1000/this.pixPerSec);
  };
  
  
  Canvas.prototype.selectPlayback=function(e,ui){
    if(this.startPixOffset == 0){
      if(this.scroll){
        this.pauseScroll();
      }
      var val = ui.value;
      if(val > this.endtime){
        $("#playback-slider").slider( "option", "value", this.lastTimeFrame);
      
      }else{
        this.lastTimeFrame= this.makeTimeKey(val);
        this.drawSignal();
      }
    }
  };
  
  //scale slider 
  
  Canvas.prototype.selectScale=function(e,ui){
    this.scale = Math.pow(10, ui.value);;
    if(!this.scroll){
      this.drawSignal();
    }
  };
  
  //let's roll 
  canvas.playScroll(); //get these wheels moving!
  
  
  //end playback slider

});