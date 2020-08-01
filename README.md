<div align="center">
  <br />
  <br />
  <p>
    <a href="https://discord.gg/3k6yxCT"><img src="https://discord.com/api/guilds/739064295857455124/embed.png" alt="Discord server" /></a>
    <a href="https://www.npmjs.com/package/slobs.js"><img src="https://img.shields.io/npm/v/slobs.js.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/slobs.js"><img src="https://img.shields.io/npm/dt/slobs.js.svg?maxAge=3600" alt="NPM downloads" /></a>
    <a href="https://www.patreon.com/Krammy"><img src="https://img.shields.io/badge/donate-patreon-F96854.svg" alt="Patreon" /></a>
  </p>
</div>

# SlobsJS
An easy solution to access Streamlabs OBS (SLOBS) websocket connections.

## How to use
### Get Token
In Streamlabs OBS, go to ``Settings``->``Remote Control`` and click on the ``QR-Code`` and then on ``show details``

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

