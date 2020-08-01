const SockJS = require('sockjs-client');

//Event message ID's to manage our callbacks from slobs.
const ID_CONNECT = 1;
const ID_STREAMSTATUS = 2;
const ID_STREAMSTATUS_CHANGED = 3;
const ID_SCENES = 4;

//Map of all the scenes in the connected Slobs. Filled with getScenes();
const scenesMap = new Map();
const slobsStatus = new Map();

//This function handles connecting to Slobs
function auth(slobs)
{
	const connectMessage = JSON.stringify({
		  jsonrpc: '2.0',
		  id: ID_CONNECT,
		  method: 'auth',
		  params: {
			resource: 'TcpServerService',
			args: [slobs.token],
		  },
		});
		console.log(slobs.token);
		console.log("connecting to slobs");
		slobs.socket.send(connectMessage);
}

//Handler for Messages based off ID's
function messageHandler(slobs)
{
	const data = JSON.parse(slobs.message.data);
	
	if (data.id !== ID_SCENES){
		console.log(slobs.message);
		console.log(data);
	}
	if (data.result)
	{
		if (data.id === ID_STREAMSTATUS)
		{
			slobsStatus.set('streamStatus', data.result.streamingStatus);
			if (data.result.streamingStatus == 'live')
			{
				slobsStatus.set('startTime', data.result.streamingStatusTime);
			} else slobsStatus.set('startTime', null);
		}
        if (data.result._type !== undefined && data.result._type === 'EVENT') {
          if (data.result.emitter === 'STREAM') {
			slobsStatus.set('streamStatus', data.result.streamingStatus);
			if (data.result.streamingStatus == 'live')
			{
				slobsStatus.set('startTime', data.result.streamingStatusTime);
			} else slobsStatus.set('startTime', null);
          }
        }
	}
	if (data.id == ID_CONNECT && data.result == false)
	{
		auth();
	}
	else if (data.id == ID_CONNECT && data.error !== undefined && data.error.message == 'INTERNAL_JSON_RPC_ERROR Invalid token')
	{
		console.log("Error with Slobs token, make sure it's correct");
	}
	else if (data.id == ID_CONNECT)
	{
		subscribeStreaming(slobs.socket);
		streamingStatus(slobs.socket);
		getScenes(slobs.socket);
	}
	if (data.id === ID_SCENES) {
		for (let i = 0; i < data.result.length; i++) {
		  const sources = new Map();
		  for (let j = 0; j < data.result[i].nodes.length; j++) {
			sources.set(data.result[i].nodes[j].name, data.result[i].nodes[j]);
		  }
		  const sceneName = data.result[i].name;
		  scenesMap.set(sceneName, sources);
		}
	}
}
//OUTPUTS ERROR OF WHY SLOBS DISCONNECTED
function disconnectHandler(slobs)
{
	console.log(slobs.message.reason);
}

//Used to get events of streaming status changes.
function subscribeStreaming(slobs) {
  const message = JSON.stringify({
    id: ID_STREAMSTATUS_CHANGED,
    jsonrpc: '2.0',
    method: 'streamingStatusChange',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
}
//Gets the starting streaming status
function streamingStatus(slobs) {
  const message = JSON.stringify({
    id: ID_STREAMSTATUS,
    jsonrpc: '2.0',
    method: 'getModel',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
}
//Requests a list of all scenes & sources
function getScenes(slobs) {
  const message = JSON.stringify({
    id: ID_SCENES,
    jsonrpc: '2.0',
    method: 'getScenes',
    params: { resource: 'ScenesService' },
  });
  slobs.send(message);
}

//ALLOWS US TO TURN ON & OFF A SOURCE
function toggleSourceVisible(slobs,sceneName, sourceName) {
  const source = scenesMap.get(sceneName).get(sourceName);
  const message = JSON.stringify({
    id: 10,
    jsonrpc: '2.0',
    method: 'setVisibility',
    params: { resource: source.resourceId, args: [!source.visible] },
  });
  slobs.send(message);
  source.visible = !source.visible;
}
//ALLOWS US TO SET THE ACTIVE SCENE
function activeScene(slobs, sceneName) {
  const scene = scenesMap.get(sceneName).values().next().value;
  const message = JSON.stringify({
    id: 10,
    jsonrpc: '2.0',
    method: 'makeSceneActive',
    params: { resource: 'ScenesService', args: [scene.sceneId] },
  });
  slobs.send(message);
}

//Converts milliseconds to time for uptime.
function msToTime(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return hrs + ':' + mins + ':' + secs;
}

module.exports = class Slobs
{
   	constructor(ip, token){
		console.log("constructing");
		if (ip === null || token === null)
		{
			return null;
		}
		this.socket = new SockJS(ip);
		this.tk = token;
		
		
		if (this.socket !== null)
		{
			//AUTHORIZE WITH SLOBS
			this.socket.onopen = () => {
				auth(this.slobs());
			};
			
			// HANDLE MESSAGES RECEIVED
			this.socket.onmessage = (message) => {
				messageHandler(this.slobs(message));
			}

			//Output error message if socket closes
			this.socket.onclose = (message) => {
				disconnectHandler(this.slobs(message));
			};
		}
	}
	
	//Returns the map of all the scenes from Slobs
	getScenes()
	{
		return scenesMap;
	}
	
	//RETURNS WHETHER STREAM IS live / offline
	getStreamingStatus() {
		return slobsStatus.get('streamStatus');
	}
	
	//RETURNS TIME SINCE STREAM STARTED IF ONLINE, ELSE RETURNS "offline".
	getUptime()
	{
		let time = slobsStatus.get('startTime');
		if(time !== null){
			let date = new Date();
			time = new Date(time);
			time = msToTime(date - time)
		}else time = "offline";
		return time;
	}
	
	//TOGGLES SOURCE ON & OFF
	toggleSource(sceneName, sourceName) {
		toggleSourceVisible(this.slobs(),sceneName, sourceName);
	},
	
	//SETS THE ACTIVE SCENE.
	setActiveScene(sceneName) {
		activeScene(this.slobs(),sceneName);
	},
	
	
	//Returns an object of all the slobs information for our messages.
	slobs(message)
	{
		return {"socket": this.socket,
				"token": this.tk, 
				"message":message
		}
	}
}



