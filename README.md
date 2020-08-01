# SlobsJS
An easy solution to access Streamlabs OBS (SLOBS) websocket connections.

### How to use
Basic slobs.js example
```
const SlobsJS = require('slobs.js');
const slobs = new SlobsJS('http://127.0.0.1:59650/api' , 'token');

console.log( slobs.getStreamingStatus() ); //Will return 'live' or 'offline' if slobs is streaming or not.
```

## Functions

``getStreamingStatus()`` returns whether slobs is streaming or not. Result: 'live' / 'offline'

``getScenes()`` returns a map of all the scenes + their sources.

``setActiveScene("scene name")`` Sets the active scene in SLOBS to the name passed. Note: This is case sensitive.

``getUptime()`` returns how long slobs has been live. Result: (hh:mm:ss) or 'offline'

``toggleSource(sceneName, sourceName)`` changes the visibility of the source in the specified scene. Node: These are case sensitive.

