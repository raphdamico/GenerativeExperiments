// USEFUL PLACES I STOLE SHAMELESSLY FROM :)
// Shamelessly stolen from: http://www.html5audio.org/2012/07/javascript-drone.html
// Building audio landscapes: http://www.flight404.com/blog/?p=143
// https://github.com/corbanbrook/dsp.js/
// view-source:http://www.storiesinflight.com/jsfft/visualizer_webaudio/
// view-source:http://chromium.googlecode.com/svn/trunk/samples/audio/visualizer-gl.html
// https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html#RealtimeAnalyserNode

var SAMPLE_RATE = 44100;
var BUFFER_SIZE = 4096;
var CONFIG = {
  equalizer: false
}

// Set up variables for UI
var lowestNote   = 36;
var noteRange   = 48;

// Set up variables for visuals
var v_ctx, v_ctx_width, v_ctx_height;
var rainbow = new Rainbow();
rainbow.setSpectrum('red', 'orange', 'yellow', 'white', 'green', 'blue');
var particles = [];

// Set up variables for audio 
var context = new webkitAudioContext();
var noiseNodes = [];
var filterNodes = [];
var baseFreq = 440;
var minFreq = 80;
var maxFreq = SAMPLE_RATE/2;
var peakFreqBuffer = [];
var peakMovingAverage = 10;

// Spectrum analyzer
var bufferSize = BUFFER_SIZE/2;
var signal = new Float32Array(bufferSize/2);
var logSignal = [];

var analyser = context.createAnalyser();
analyser.fftSize = bufferSize;
analyser.connect(context.destination);

//connect gain
var gain = context.createGainNode();
gain.gain.value = 15.0;
gain.connect(analyser);

window.createPulse = function(freq) {

    var osc = new Oscillator('SINEWAVE', 220, 1, 4096, 22050);
    osc.generate();
    var pulse = osc.signal; 

    var envelope = new ADSR(0.1, 0.01, 0, 0.1, 0.2, 44100);
    envelope.process(pulse);


    var noiseSource = context.createJavaScriptNode(BUFFER_SIZE, 1, 1);
    noiseSource.onaudioprocess = function (e) {
      var outBufferL = e.outputBuffer.getChannelData(0);      
      for (var i = 0; i < BUFFER_SIZE; i++) {
        outBufferL[i] = pulse[i];
      }    
    };

    var source = context.createBufferSource(); // creates a sound source
    source.buffer = pulse;                    // tell the source which sound to play
    source.connect(context.destination);       // connect the source to the context's destination (the speakers)
    source.noteOn(0);                          // play the source now

    //noiseSource.connect(context.destination);
}

function createNoiseGen(freq) {
  var panner = context.createPanner();
  var max = 20;
  var min = -20;
  var x = rand(min, max);
  var y = rand(min, max);
  var z = rand(min, max);
  panner.setPosition(x, y, z);
  panner.connect(gain);

  var filter = context.createBiquadFilter();
  filter.type = filter.BANDPASS;
  filter.frequency.value = freq;
  filter.Q.value = 150;
  filter.connect(panner);
  filterNodes.push(filter);

  var noiseSource = context.createJavaScriptNode(BUFFER_SIZE, 1, 2);
  noiseSource.onaudioprocess = function (e) {
    var outBufferL = e.outputBuffer.getChannelData(0);
    var outBufferR = e.outputBuffer.getChannelData(1);
    for (var i = 0; i < BUFFER_SIZE; i++) {
      outBufferL[i] = outBufferR[i] = Math.random() * 2 - 1;
    }    
  };
  noiseSource.connect(filter);
  noiseNodes.push(noiseSource);

  setInterval(function () {
    x = x + rand(-0.1, 0.1);
    y = y + rand(-0.1, 0.1);
    z = z + rand(-0.1, 0.1);
    panner.setPosition(x, y, z);
  }, 500);

}

var scale = [0.0, 2.0, 4.0, 6.0, 7.0, 9.0, 11.0, 12.0, 14.0];

function generate(){
  var base_note = 64;// parseInt($('#BaseNote').val());
  var num_osc = 40;//parseInt($('#NumOsc').val());
  for (var i = 0; i < num_osc; i++) {
    var degree = Math.floor(Math.random() * scale.length);
    var freq = mtof(base_note + scale[degree]);
    freq += Math.random() * 4 - 2;
    createNoiseGen(freq);
  }
}

function mtof(m) {
  return Math.pow(2, (m - 69) / 12) * 440;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function reset(){
  while (noiseNodes.length){
    noiseNodes.pop().disconnect();
  }
  while (filterNodes.length){
    filterNodes.pop().disconnect();
  }
  
  generate();
}

window.changeFreq = function(newFreq) {
  for (var i=0; i<filterNodes.length; i++){
    if (Math.random() > 0.25) {
      filterNodes[i].frequency.value = newFreq;
    }
  }
  baseFreq = newFreq;
}

window.harmonize = function(newNote, falloff) {
  for (var i=0; i<filterNodes.length; i++){
    // var distance = Math.round(falloff * 10 * (Math.random() - 1));
    // var multiplier = 1;//Math.pow(2, distance);
    // filterNodes[i].frequency.value = newFreq * multiplier;
    
    var degree = Math.floor(Math.random() * scale.length);
    var newFreq = mtof(newNote + scale[degree]);
    newFreq += Math.random() * 4 - 2;
    filterNodes[i].frequency.value = newFreq;

  }
  baseFreq = newFreq;
  return filterNodes;
}

////////////////////////////////////////////////////////
//
// UI
//

function bindEvents(){

  $('#BaseNote2').on('mouseup keyup', function(){
      var newFreq = $(this).val()
      baseFreq = newFreq;
      harmonize(newFreq, 0);
  });

  // var controls = $(".control");
  // controls.each(function(){
  //   $(this).data('lastVal', $(this).val());
  //   var id = $(this).attr('id');
  //   $("label[for='"+id+"'] .controlVal").text($(this).val());
  // });

  // controls.on('mouseup keyup', function(){
  //   var control = $(this);
  //   var val = control.val();
  //   if (val !== control.data('lastVal')){
  //     control.data('lastVal', val);
  //     reset();
  //   }
  // });

  // controls.change(function(){
  //   var id = $(this).attr('id');
  //   $("label[for='"+id+"'] .controlVal").text($(this).val());
  // })
}

function mouseMove(e) {
  for (var i=0; i<5; i++) {
    newParticle = new Particle(e.offsetX + Math.random()*40, e.offsetY + Math.random()*40, + Math.random()*20);
    particles.push(newParticle);
  }  
}

function mouseClick(e) {
  var mousePos    = (e.offsetX/v_ctx_width);
  var curNote     = lowestNote + Math.round(mousePos * noteRange);
  window.harmonize(curNote, (e.offsetY/v_ctx_height)*4);
  for (var i=0; i<5; i++) {
    newParticle = new Particle(e.offsetX + Math.random()*40, e.offsetY + Math.random()*40, + Math.random()*20);
    particles.push(newParticle);
  }  
}

////////////////////////////////////////////////////////
//
// SEXY ANIMATION
//

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// Particles
var Particle = function(x, y, size) {
  this.x    = x;
  this.y    = y;
  this.size = size;
  this.update();
}
Particle.prototype.update = function() {
  this.size--;
  v_ctx.fillStyle = "BLACK";
  v_ctx.fillRect(this.x,this.y, this.size, this.size);  
  return this;
}

function setupVisualizer() {
  window.canvas = document.getElementById("visualizer_canvas");  
  window.$window = $(window);
  v_ctx = canvas.getContext("2d");
  v_ctx_width = canvas.width;
  v_ctx_height = canvas.height;

  canvas.addEventListener("mousemove", mouseMove, false);
  canvas.addEventListener("click", mouseClick, false);
}

var count = 0;
function render() {
  // count++;
  // if (count%320) {
  //   createPulse(200);
  // }
  // get window width
  //if (window.$window.width() !== v_ctx_width) { $('#visualizer_canvas').width(window.$window.width()); v_ctx_width = canvas.width; };
  //if (window.$window.height() !== v_ctx_width) { $('#visualizer_canvas').height(window.$window.height()); v_ctx_height = canvas.height; };


  // v_ctx_width = canvas.width;
  // v_ctx_height = canvas.height;

  // Get latest audio signal
  analyser.getFloatFrequencyData(signal);
  var minDb = analyser.maxDecibels;
  var maxDb = analyser.minDecibels;

  // Calculate dominant frequency
  // First limit search to area around base frequency to stabilize color
  var rangeToSearch = 2;
  var freqRangeMin = baseFreq / rangeToSearch;
  var freqRangeMax = baseFreq * rangeToSearch;
  var freqRangeMinIndex = Math.round(signal.length * (freqRangeMin/maxFreq));
  var freqRangeMaxIndex = Math.round(signal.length * (freqRangeMax/maxFreq));

  var frequencyWithGreatestAmplitude = 0;
  for (var i=freqRangeMinIndex; i<freqRangeMaxIndex; i++) {
      amplitude = signal[i] - (minDb+maxDb);      
      if (amplitude > frequencyWithGreatestAmplitude) {
        frequencyWithGreatestAmplitude = (i/signal.length) * maxFreq;        
        peakFreqBuffer.push(frequencyWithGreatestAmplitude);
        if (peakFreqBuffer.length > peakMovingAverage) {
          peakFreqBuffer.shift();
        }

      }
  }
  var movingAvgPeakFreq = _.reduce(peakFreqBuffer, function(memo, num){ return memo + num; }, 0) / peakMovingAverage;

  // Clear the canvas
  v_ctx.clearRect(0,0, v_ctx_width, v_ctx_height);
  
  // Draw the background
  var logScaledColor = Math.log(Math.max(1, movingAvgPeakFreq-minFreq)) / Math.log(maxFreq - minFreq) * 100;
  var freq_color = rainbow.colourAt(logScaledColor);

  var my_gradient = v_ctx.createLinearGradient(0, 0, 0, v_ctx_height);
  my_gradient.addColorStop(0, rainbow.colourAt(Math.max(0,logScaledColor-20)));
  my_gradient.addColorStop(1, freq_color);
  v_ctx.fillStyle = my_gradient;
  v_ctx.fillRect(0,0, v_ctx_width, v_ctx_height);
  v_ctx.fillStyle = "BLACK";
  
  // Update particles
  for (var i=0; i<particles.length; i++) {
    particle = particles[i].update();
    if (particle.size < 0 ) { particles.splice(i, 1); }
  }

  // Transform FFT output to logarithm
  var logMax = Math.log(signal.length) / Math.LN10;
  var buckets = 256;
  var bucketWidth = logMax / buckets;
  var bucketPixelWidth = v_ctx_width / buckets;
  for (var i=0; i<buckets; i++) {
    signalToRead = Math.round(Math.exp(i*bucketWidth * Math.LN10));
    amplitude = signal[signalToRead] - (minDb+maxDb);
    logSignal[i] = amplitude;
  }

  // Draw visuals
  // Transparent white mountain backgrounds
  for (var i=0; i<buckets; i++) {
    amplitude = logSignal[i];

    v_ctx.beginPath();
    v_ctx.moveTo(i*bucketPixelWidth - bucketPixelWidth/2, v_ctx_height);
    v_ctx.lineTo(i*bucketPixelWidth + bucketPixelWidth/2, v_ctx_height);
    v_ctx.lineTo(i*bucketPixelWidth, v_ctx_height - amplitude);
    v_ctx.fill();

    v_ctx.fillStyle = "rgba(255,255,255,0.5)";
    var mountainWidth = 80;
    if (i%24 === 0) {
      mountainWidth = 100 + 100 * (i%9);
      v_ctx.beginPath();
      v_ctx.moveTo(i*bucketPixelWidth - mountainWidth/2, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth + mountainWidth/2, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth, v_ctx_height - amplitude*4);
      v_ctx.fill();      
    }  
  }
  // Black foreground mountains
  for (var i=0; i<buckets; i++) {
    amplitude = logSignal[i];
    var mountainWidth = 80;
    if (i%24 === 0) {
      v_ctx.fillStyle = "black";
      mountainWidth = 100 + 100 * (i%9);
      v_ctx.beginPath();
      v_ctx.moveTo(i*bucketPixelWidth - mountainWidth/2, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth + mountainWidth/2, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth, v_ctx_height - amplitude*3);
      v_ctx.fill();

      v_ctx.fillStyle = "grey";
      v_ctx.beginPath();
      v_ctx.moveTo(i*bucketPixelWidth - mountainWidth/2, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth - mountainWidth/1.8, v_ctx_height);
      v_ctx.lineTo(i*bucketPixelWidth, v_ctx_height - amplitude*3);
      v_ctx.fill();
    }  
  }
  // Full equalizer
  if (CONFIG.equalizer) {
    v_ctx.fillStyle = "white";
    for (var i=0; i<buckets/4; i++) {
        amplitude = logSignal[i*4];
        v_ctx.fillRect(i*4*bucketPixelWidth, v_ctx_height - amplitude/2, bucketPixelWidth, amplitude/2); 
    }
  }

  // No buckets
  // var bucketPixelWidth = v_ctx_width / signal.length;
  // for (var i=0; i<signal.length; i++) {
  //   amplitude = signal[i] - (minDb+maxDb);      
  //   v_ctx.fillRect(i*bucketPixelWidth, v_ctx_height - amplitude, bucketPixelWidth, amplitude);   
  // }

  // MANUALLY COMPUTE BUCKETS (NOT NECESSARY!)
  // var buckets = 2048;
  // var bucketWidth = signal.length / buckets;
  // var bucketPixelWidth = v_ctx_width / buckets;
  // // var bucketedSpectrum = 
  // for (var i=0; i<buckets; i++) {
    
  //   // Calculate average amplitude of frequency bucket
  //   totalBucketAmplitude = 0;
  //   for (var b=0; b<bucketWidth; b++) {
  //     totalBucketAmplitude += signal[i] - (minDb+maxDb);  
  //   }
  //   averageBucketAmplitude = totalBucketAmplitude / bucketWidth;
    
  //   // Draw on canvas
  //   v_ctx.fillRect(i*bucketPixelWidth, v_ctx_height - averageBucketAmplitude, bucketPixelWidth, averageBucketAmplitude);   
  // }
}

////////////////////////////////////////////////////////
//
// KICK THINGS OFF
//

$(function(){
  generate();
  bindEvents();
  setupVisualizer();

  (function animloop(){
    requestAnimFrame(animloop);
    render();
  })();

});
