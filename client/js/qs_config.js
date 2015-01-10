$(function(){  

var colors ={
    shBlue: '#00102F',
    shGreen: '#5CBD59',
    shDarkBlue: "#061830"
};




canvasConfig =function canvasConfig(){
  this.pixPerSec      = 20;  //10 pix/sec = samples second i.e. the highest resolution we can display
  this.timeWindowSec  = 102.4;
  this.timeStep       = 1000/this.pixPerSec;
  this.channelHeight  = 200; //how many pix for each signal
  this.height         = null;
  this.width          = this.timeWindowSec*this.pixPerSec;
  this.buffer         = null;
  this.axisColor      = "#000";
	this.lineWidth      = 1;
	this.tickInterval   = 10*1000;
  this.starttime      = Date.now()*1000; //make these real big and real small so they will be immediately overwritten
  this.endtime        = 0;
  this.startPixOffset = this.width;//starttime pixelOffset
  this.lastTimeFrame  = null; // track the time of the last time frame(left side of canvas this will be incremented each interval)
  this.canvasElement  = document.getElementById("quakeShake");
  this.localTime      = true;
  this.stationScalar  =3.207930*Math.pow(10,5)*9.8; // count/scalar => %g
  //log values
  this.scale          = 2; //strarting scale slide value 
  this.zoomSliderMin  = 0;
  this.zoomSliderMax  = 3;
  //end log values
  this.realtime       = true; //realtime will fast forward if tail of buffer gets too long.
  this.scroll         = null; //sets scrolling
  this.timeout        = 30; //Number of minutes to keep active before prompt
};
              
              
channels = [
    new Scnl({
    sta: "HWK1",  
    chan: "HNZ", 
    net: "UW", 
    loc: "--", 
    max: null,
    position: 2, //from top 0 is highest
    lineColor: colors.shBlue
  }),
      new Scnl({
      sta: "HWK2",  
      chan: "HNZ", 
      net: "UW", 
      loc: "00", 
      max: null,
      position: 1, //from top 0 is highest
      lineColor: colors.shGreen
    }),
      new Scnl({
      sta: "HWK3",  
      chan: "HNZ", 
      net: "UW", 
      loc: "--", 
      max: null,
      position: 0, //from top 0 is highest
      lineColor: colors.shDarkBlue
    })
];

//host = "http://quakeshakeLB-814759012.us-west-2.elb.amazonaws.com:80"
host = "http://quakeshaketest1.azurewebsites.net:80"

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

});