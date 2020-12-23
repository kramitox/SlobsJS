const SockJS = require('sockjs-client');
const EventEmitter = require('events');

const ID_CONNECT = 1;
const ID_STREAMSTATUS = 2;
const ID_STREAMSTATUS_CHANGED = 3;
const ID_SCENES = 4;
const ID_TOGGLE = 5;

//Map of all the scenes in the connected Slobs. Filled with getScenes();
const scenesMap = new Map();
const slobsStatus = new Map();
var connected = false;

/**
 * @private
 * 
 * This function handles sending our authorization token to Slobs
 * 
 * @param {object} slobs object containing slobs information.The slobs object created with slobs(message).
 *
 *
 */
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
		slobs.socket.send(connectMessage);
}

/**
 * @private
 * Handler for Messages based off ID's
 * @param {object} slobs object containing slobs information.The slobs object created with slobs(message).
 */
function messageHandler(slobs, emitter)
{
	const data = JSON.parse(slobs.message.data);
	if (data.result)
	{
		
		if (data.id === ID_STREAMSTATUS)
		{
			slobsStatus.set('streamStatus', data.result.streamingStatus);
			slobsStatus.set('recordingStatus', data.result.recordingStatus);
			if (data.result.streamingStatus == 'live')
			{
				slobsStatus.set('StreamStartTime', data.result.streamingStatusTime);
			} else slobsStatus.set('startTime', null);
			if (data.result.recordingStatus == 'recording')
			{
				slobsStatus.set('recordingStartTime', data.result.recordingStatusTime);
			}else slobsStatus.set('recordingStartTime', null);
		}
        if (data.result._type !== undefined && data.result._type === 'EVENT') {
          if (data.result.emitter === 'STREAM' && data.result.resourceId === 'StreamingService.streamingStatusChange') {
			slobsStatus.set('streamStatus', data.result.data);
			if (data.result.data == 'live')
			{
				emitter.emit('streamStarted');
				slobsStatus.set('startTime', new Date());
			} else if (data.result.data == 'offline')
			{
				emitter.emit('streamEnded');
				 slobsStatus.set('startTime', null);
			}
		  }
		  
		  else if (data.result.emitter === 'STREAM' && data.result.resourceId === 'StreamingService.recordingStatusChange') {
			emitter.emit('recordingStatusChange' , data.result.data);
			slobsStatus.set('recordingStatus', data.result.data);
			if (data.result.data == 'recording')
			{
				emitter.emit('recordStarted');
				slobsStatus.set('recordingStartTime', new Date());
			} else if (data.result.data == 'offline') {
				emitter.emit('recordEnded');
				slobsStatus.set('recordingStartTime', null);
			}
		  }
        }
	}
	if (data.id == ID_CONNECT && data.result == false)
	{
		auth();
	}
	else if (data.id == ID_CONNECT)
	{
		if (data.error)
		{
			emitter.emit('error', data.error.message);
			return;
		}
		connected = true;
		emitter.emit('connected');
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
/**@private
 * /OUTPUTS ERROR OF WHY SLOBS DISCONNECTED
 * @param {object} slobs object containing slobs information.
 */
function disconnectHandler(slobs, emmiter)
{
	emmiter.emit('close', slobs.message.reason);
	connected = false;
}

/**@private
 * Used to get events of streaming status changes.
 * @param {object} slobs object containing slobs information.
 */
function subscribeStreaming(slobs) {
  let message = JSON.stringify({
    id: ID_STREAMSTATUS_CHANGED,
    jsonrpc: '2.0',
    method: 'streamingStatusChange',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
  
  message = JSON.stringify({
    id: ID_STREAMSTATUS_CHANGED,
    jsonrpc: '2.0',
    method: 'recordingStatusChange',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
  
}
/**@private
 * Gets the starting streaming status
 * @param {object} slobs object containing slobs information.
 */
function streamingStatus(slobs) {
  const message = JSON.stringify({
    id: ID_STREAMSTATUS,
    jsonrpc: '2.0',
    method: 'getModel',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
}

/**@private
 * Toggles slobs streaming between offline/live
 * @param {object} slobs object containing slobs information.
 */
function toggleStreaming(slobs)
{
	const message = JSON.stringify({
    id: ID_TOGGLE,
    jsonrpc: '2.0',
    method: 'toggleStreaming',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
}
/**@private
 * Toggles slobs recording between offline/recording
 * @param {object} slobs object containing slobs information.
 */
function toggleRecording(slobs)
{
	const message = JSON.stringify({
    id: ID_TOGGLE,
    jsonrpc: '2.0',
    method: 'toggleRecording',
    params: { resource: 'StreamingService' },
  });
  slobs.send(message);
}
/**@private
 * Requests a list of all the scenes in slobs.
 * @param {object} slobs object containing slobs information.
 */
function getScenes(slobs) {
  const message = JSON.stringify({
    id: ID_SCENES,
    jsonrpc: '2.0',
    method: 'getScenes',
    params: { resource: 'ScenesService' },
  });
  slobs.send(message);
}

/**@private
 * Allows us to turn on/off a source.
 * @param {object} slobs object containing slobs information.
 * @param {string} sceneName case sensitive name of scene.
 * @param {string} sourceName case sensitive name of source.
 */
function toggleSourceVisible(slobs,sceneName, sourceName) {
  if (sceneName !== null){	
	  let source = scenesMap.get(sceneName).get(sourceName);
	  let scene = scenesMap.get(sceneName)
	  if (source.sceneNodeType === 'folder')
	  {
		  for (let value of scene.values())
		  {
			  for (let j = 0; j < source.childrenIds.length; j++)
			  {
				  if (value.id === source.childrenIds[j])
				  {
					  const message = JSON.stringify({
						id: ID_TOGGLE,
						jsonrpc: '2.0',
						method: 'setVisibility',
						params: { resource: value.resourceId, args: [!value.visible] },
					  });
					  slobs.send(message);
					  value.visible = !value.visible;
				  }
			  }
		  }
	  }
	  else{
		  const message = JSON.stringify({
			id: ID_TOGGLE,
			jsonrpc: '2.0',
			method: 'setVisibility',
			params: { resource: source.resourceId, args: [!source.visible] },
		  });
		  slobs.send(message);
		  source.visible = !source.visible;
	  }
  }
  else{
	  for (let key of scenesMap.keys())
	  {
		  let source = scenesMap.get(key).get(sourceName);
		  let scene = scenesMap.get(key)
		  if (source !== undefined){
			  if (source.sceneNodeType === 'folder')
			  {
				  for (let value of scene.values())
				  {
					  for (let j = 0; j < source.childrenIds.length; j++)
					  {
						  if (value.id === source.childrenIds[j])
						  {  
							  const message = JSON.stringify({
								id: ID_TOGGLE,
								jsonrpc: '2.0',
								method: 'setVisibility',
								params: { resource: value.resourceId, args: [!value.visible] },
							  });
							  slobs.send(message);
							  value.visible = !value.visible;
						  }
					  }
				  }
			  }
			  else{
				  const message = JSON.stringify({
					id: ID_TOGGLE,
					jsonrpc: '2.0',
					method: 'setVisibility',
					params: { resource: source.resourceId, args: [!source.visible] },
				  });
				  slobs.send(message);
				  source.visible = !source.visible;
			  }
			}
	  }
  }
}
/**@private
 * Allows us to set active scene.
 * @param {object} slobs 
 * @param {string} sceneName case sensitive name of scene.
 */
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

/**@private
 * @param {int} s milliseconds to be converted to time.
 * @returns {string} Time formatted hh:mm:ss.
 * @example msToTime(144324234);
 *
 * 
 */
function msToTime(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return hrs + ':' + mins + ':' + secs;
}

class Slobs extends EventEmitter
{
	/**
	 * @class Class that represents Slobs
	 * @author Krammy <krammy_ie@outlook.com>
	 * @constructor
	 * @param {string} ip IP Address where slobs is running. Local: http://127.0.0.1:59650/api
	 * @param {string} token Settings->Remote Control and click on the QR-Code and then on show details.
	 * @example slobs = new SlobsJS("127.0.0.1:59650/api", "token2143u323i4oy");
	 *
	 * 
	 */
	constructor(){
		super();
        this.socket = null;
        this.tk = null;
    }

	login(ip, token) {
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
                messageHandler(this.slobs(message), this);
            }

            //Output error message if socket closes
            this.socket.onclose = (message) => {
                disconnectHandler(this.slobs(message), this);
            };
        }
	}
	disconnect()
	{
		this.socket.close(1000, "disconnecting");
		this.tk = null;
		this.socket = null;
		scenesMap.clear();
		slobsStatus.clear();
	}
	/**@public
	 * 
	 * Gets the map of all the scenes from Slobs
	 * @example slobs.getScenes();
	 * @returns {Map} Map of all scenes & sources.
	 * 
	 *
	 * 
	 */
	getScenes()
	{
		return scenesMap;
	}
	
	/**@public
	 * Gets whether stream is live / offline
	 * @example slobs.getStreamingStatus();
	 * @returns {string} live / offline
	 *
	 * 
	 */
	getStreamingStatus() {
		return slobsStatus.get('streamStatus');
	}
	
	/**@public
	 *Gets time since stream started if online (hh:mm:ss), otherwise returns 'offline'.
	* @example slobs.getStreamUptime();
	 * @returns {string} Time formatted (hh:mm:ss) or 'offline'
	 *
	 * 
	 */
	getStreamUptime()
	{
		let time = slobsStatus.get('startTime');
		if(time !== null){
			let date = new Date();
			time = new Date(time);
			time = msToTime(date - time)
		}else time = "offline";
		return time;
	}
	/**@public
	 *Gets time since stream started if recording (hh:mm:ss), otherwise returns 'offline'.
	 * @example slobs.getRecordingUptime();
	 * @returns {string} Time formatted (hh:mm:ss) or 'offline'
	 *
	 * 
	 */
	getRecordingUptime()
	{
		let time = slobsStatus.get('recordingStartTime');
		if(time !== null){
			let date = new Date();
			time = new Date(time);
			time = msToTime(date - time)
		}else time = "offline";
		return time;
	}
	
	/**@public
	 * Allows us to toggle on/off a Source in SLOBS.
	 * @param {string} sceneName Case sensitive name of the Scene the source belongs to.
	 * @param {string} sourceName Case sensitive name of the Source we wish to toggle.
	 *
	 * @example slobs.toggleSource("Game Scene", "Webcam")
	 *
	 * 
	 */
	toggleSource(sceneName, sourceName) {
		toggleSourceVisible(this.socket,sceneName, sourceName);
	}
	/**@public
	 * Set's the defined scene as the active scene.
	 * @param {string} sceneName Case sensitive name of the Scene we wish to set as active.
	 * @example slobs.setActiveScene("Game Scene");
	 *
	 * 
	 */
	setActiveScene(sceneName) {
		activeScene(this.socket,sceneName);
	}
	
	
	/**@public
	 * Toggles recording on/off
	 * @example slobs.toggleRecording();
	 *
	 * 
	 */
	toggleRecording()
	{
		toggleRecording(this.socket);
	}
	
	/**@public
	 * Toggles streaming on/off
	 * @example slobs.toggleStreaming();
	 *
	 * 
	 */
	toggleStreaming()
	{
		toggleStreaming(this.socket);
	}
	/**@public
	 * returns true/false if connected to Streamlabs OBS
	 * @example var connected = slobs.getConnection();
	 *
	 * 
	 */
	getConnected()
	{
		return connected;
	}
	
	
	
	/**@private
	 * Returns an object of all the slobs information for our messages.
	 * @param {string} message the message received from Slobs.
	 * @returns {*} Object containing information for messageHandlers.
	 *
	 * 
	 */
	slobs(message)
	{
		return {"socket": this.socket,
				"token": this.tk, 
				"message":message
		}
	}
}

module.exports = Slobs;

