const FFTSIZE = 1024;
const HEIGHT = 400;
const PREFIX = "recorder";

var gc;
var canvas;
var audio = new AudioContext();
var analyser;
var stream;
var buf;
var recorder;
var storage = navigator.getDeviceStorage("music");

var indicator;

var createFileName = function(event){
  return PREFIX + "-" + event.timeStamp + ".ogg";
};

var recording = function(){
  return recorder != null && recorder.state == "recording";
};

var startStopRecorder = function(){
  if(recording()){
    console.log("recorder stopped");
    recorder.stop();
    indicator.style.display = "none";
  }else{
    console.log("recorder started");
    recorder.start();
    indicator.style.display = "block";
  }
  console.log(recorder.state);
};

var initRecorder = function(stream){
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    console.log(event); 
    if(storage != null){
      var filename = createFileName(event);
      console.log("attempt to save as " + filename);
      var req = storage.addNamed(event.data, filename);
      req.onsuccess = function(){
        console.log("saved as " + this.result);
      };
      req.onerror = function(){
        console.log(this.error.name);
      };
    }
  };
};

var initAnalyser = function(){
  if(analyser == null){
    analyser = audio.createAnalyser();
    analyser.fftsize = FFTSIZE;
    buf = new Uint8Array(analyser.frequencyBinCount);
    console.log("init analyser");
  }
};

var streamAquired = function(aquired){
  stream = aquired;
  initAnalyser();
  var source = audio.createMediaStreamSource(aquired);
  console.log(source);
  source.connect(analyser);
  initRecorder(aquired);
  update();
};

var aquireStream = function(){
  navigator.getUserMedia = 
    navigator.getUserMedia || navigator.mozGetUserMedia;
  if(navigator.getUserMedia){
    console.log("getUserMedia is avialable");
    navigator.getUserMedia({video: false, audio: true}, 
                           streamAquired, 
                           error =>{
                             console.log(error);
                           });
  }else{
    console.log("no getUserMedia");
  }
};

var update = function(){
  if(analyser && buf && gc){
    analyser.getByteTimeDomainData(buf);
    gc.fillStyle = "rgba(51, 51, 51, .4)";
    gc.fillRect(0, 0, FFTSIZE, HEIGHT);
    
    var unitWidth = FFTSIZE * 1.0 / buf.length;
    
    gc.lineWidth = 2;
    gc.strokeStyle = "#eee";
    gc.beginPath();
    
    var x = 0;
    for(var i = 0; i < buf.length; i++){
      var y = buf[i] / 128.0 * HEIGHT / 2;
      x = x + unitWidth;
      if(i === 0){
        gc.moveTo(x, y);
      }else{
        gc.lineTo(x, y);
      }
    }
    gc.stroke();
  }
  window.requestAnimationFrame(update);
};

window.addEventListener("load", function() {
  aquireStream();
  canvas = document.querySelector("#canvas");
  canvas.setAttribute("width", FFTSIZE);
  canvas.setAttribute("height", HEIGHT);
  canvas.style.height = window.innerHeight + "px";
  gc = canvas.getContext("2d");

  indicator = document.querySelector("#recording");

  canvas.addEventListener("click", event => {
    startStopRecorder();
  });
});

window.addEventListener("unload", event => {
  if(recording()){
    recorder.stop();
    recorder = null;
  }
  if(stream != null){
    stream.stop();
    stream = null;
  }
});
