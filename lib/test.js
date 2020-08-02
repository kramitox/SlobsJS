const SlobsJS = require('./index.js');
const slobs = new SlobsJS('http://127.0.0.1:59650/api' , '4bda7f7d554565e0e1bcd48293449133aa1465a4');

setTimeout(function(){ slobs.toggleRecording()}, 4000);