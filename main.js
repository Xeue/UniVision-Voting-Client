/*jshint esversion: 6 */
const { app, BrowserWindow, ipcMain } = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const url = require('url');

//Net import for TCP Stream
const Net = require("net");

//TCP Stream constants
const casparIP = "127.0.0.1";
const casparPort = 5250;

let casperEnabled = true;
let mainWindow;
let store = {header: 'default', value: 'default'};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    backgroundColor: "#313335",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      preload: path.join(__dirname, "./GUI/js/preload.js") // use a preload script
    }
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, './GUI/GUI.html'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.focus();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    launchIntervalConnect();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


function sendToClient(data) {
  if (typeof data != "object") {
    store.header = 'STRING';
    store.value = data;
  } else {
    store = data;
  }
  mainWindow.webContents.send('casparMeta', store);
  store.header = '';
}

function sendStringToClient(message){
  store = {header: 'CG-CONNECTING', value: message};
  mainWindow.webContents.send('casparMeta', store);
}

//TCP Stream to CasparCG Server

//Create Stream object
const stream = new Net.Socket();
let casparConnected = false;
let casparFirstConnection = true;
let errorCount = 0;
let intervalConnect = false;
const casparTimeout = 5000;

//Connect to Caspar Server
const casparConnect = () => {
  console.log("Connecting");
  stream.connect(casparPort, casparIP);
};

//Reconnection functions - will try to reconnect every 5 seconds.
const launchIntervalConnect = () => {
  console.log("Starting connection process");
  if (false != intervalConnect) return;
  store = {header: 'CG-CONNECTION', value: 'CONNECTING'};
  sendToClient(store);
  intervalConnect = setInterval(casparConnect, casparTimeout);
};

const clearIntervalConnect = () => {
  if (false == intervalConnect) return;
  clearInterval(intervalConnect);
  intervalConnect = false;
};

//Message helper
const sendMessage = (command) => {
  let commandBuffer = Buffer.from(command + "\r\n", "utf8");
  stream.write(commandBuffer);
  console.log("Caspar command sent: ", command);
};

stream.on("connect", () => {
  clearIntervalConnect();
  console.log(`CASPAR: Connected to Caspar Server ${casparIP}:${casparPort}`);
  errorCount = 0;
  casparFirstConnection = false;
  casparConnected = true;
  setTimeout(() => {
    store = {header: 'CG-CONNECTION', value: 'CONNECTED'};
    sendToClient(store);
    sendMessage("INFO");
    payload = {
      duration: 420
    };
    message = `CG 1-2 ADD 1 "UNIVISION/SCORES" 1 "${escapeJSON(payload)}"`;
    sendMessage(message);
  }, 5000);

});

const casparDataHandler = (data) => {
  console.log("Got data from caspar");
  let dataAsString = data.toString().replace(/^[\s\t]*(\r\n|\n|\r)/gm, "");
  store = {header: 'CG-RECEIVED-DATA', value: dataAsString};
  sendToClient(store);
};

stream.on("error", (err) => {
  errorCount += 1;
  console.error(
      `CASPAR// Connection Attempt failed (${errorCount}) - ${err.code}`
  );
  store = {header: 'CG-CONNECTION', value: 'ERROR'};
  sendToClient(store);
});

stream.on("data", (data) => {
  casparDataHandler(data);
});

stream.on("close", ()=> casperEnabled ? launchIntervalConnect() : sendStringToClient("Caspar stream disconnected and disabled, will not reconnect"));
stream.on("end", ()=> casperEnabled ? launchIntervalConnect() : sendStringToClient("Caspar stream disconnected and disabled, will not reconnect"));

if (casperEnabled == "TRUE") casparConnect();


//IPC Listener

//Escaping function
function escapeJSON(object) {
  let objectJSON = {};
  objectJSON = JSON.stringify(object);
  return objectJSON.replace(/"/g, '\\"');
}

function playIdent() {
  sendMessage(`PLAY 2-10 "IDENT" CUT 1 Linear RIGHT`);
}

function playClip(clip) {
  let clipName = clip.toUpperCase();
  sendMessage(`PLAY 2-11 "${clipName}" CUT 1 Linear RIGHT`);
}

function clearIdent() {
  message = `CLEAR 2-10`;
  sendMessage(message);
}

function clearClip() {
  message = `CLEAR 2-11`;
  sendMessage(message);
}

ipcMain.on('casparCommand', (event, data) => {
  let message = '';
  let payload = {};
  switch (data.command) {
    case "unis":
      payload = {
        state: "unis",
        data: data.data
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "load":
      message = `CLEAR 1`;
      sendMessage(message);
      payload = {
        duration: 420
      };
      message = `PLAY 1-1 "lOOP" CUT 1 Linear RIGHT`;
      sendMessage(message);
      message = `CG 1-2 ADD 1 "UNIVISION/SCORES" 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "stop":
      payload = {
        state: "stop"
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);

      setTimeout(playIdent, 500);

      break;
    case "cueJudge":
      payload = {
        state: "reset"
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      setTimeout(function(){
        playClip("IDENTS/"+data.judge);
      }, 500);
      break;
    case "reset":
      payload = {
        state: "reset"
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      setTimeout(playIdent, 500);
      //setTimeout(clearIdent, 3500);
      break;
    case "clear":
      payload = {
        state: "clear"
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      payload = {
        state: "stop"
      };
      message = `CG 1-3 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      payload = {
        state: "stop"
      };
      message = `CG 2-1 UPDATE 1 "${escapeJSON(payload)}"`; //-CHANGE
      sendMessage(message);
      payload = {
        state: "stop"
      };
      message = `CG 1-4 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "ident":
      playIdent();
      break;
    case "clip":
      playClip(data.data);
      break;
    case "clipClear":
      clearClip(data.data);
      break;
    case "clearAll":
      message = `CLEAR 1`;
      sendMessage(message);
      message = `CLEAR 2`;
      sendMessage(message);
      break;
    case "pushScore":
      payload = data;
      payload.state = "update";
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "pullScore":
      payload = data;
      payload.state = "downdate";
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "selectJudge":
      payload = data;
      payload.state = "judge";
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "selectPublic":
      payload = data;
      payload.state = "public";
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "reorder":
      payload = {
        state: "reorder"
      };
      message = `CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "actsPush":
      payload = {
        state: "start"
      };
      message = `CG 1-3 ADD 1 "UNIVISION/ACTS" 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "actsStart":
      message = `CG 1-3 ADD 1 "UNIVISION/ACTS" 1`;
      sendMessage(message);
      break;
    case "actsPull":
      payload = {
        state: "stop"
      };
      message = `CG 1-3 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "creditsPush":
      payload = {
        duration: data.data
      };
      message = `CG 2-11 ADD 1 "CREDITS_V6/CREDITS" 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "creditsPull":
      payload = {
        state: "stop"
      };
      message = `CG 2-11 STOP 1`;
      sendMessage(message);
      break;
    case "timerPush":
      payload = {
        state: "start"
      };
      message = `CG 1-4 ADD 1 "UNIVISION/COUNT" 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      break;
    case "timerPull":
      payload = {
        state: "stop"
      };
      message = `CG 1-4 UPDATE 1 "${escapeJSON(payload)}"`;
      sendMessage(message);
      message = `CG 1-4 STOP 1`;
      setTimeout(function(){
        sendMessage(message);
      },2000);
      break;
    case "l3rdJudge":
      payload = {
        state: "startJudge",
        judge: data.judge
      };
      console.log(payload);
      message = `CG 2-1 ADD 1 "UNIVISION/L3RD" 1 "${escapeJSON(payload)}"`;  //-CHANGE
      sendMessage(message);
      break;
    case "l3rd":
      payload = {
        state: "start",
        name: data.name,
        role: data.role
      };
      message = `CG 2-1 ADD 1 "UNIVISION/L3RD" 1 "${escapeJSON(payload)}"`;  //-CHANGE
      sendMessage(message);
      break;
    case "l3rdQuiz":
      payload = {
        state: "quiz",
        left: data.left,
        right: data.right,
        leftText: data.leftText,
        rightText: data.rightText
      };
      message = `CG 2-1 UPDATE 1 "${escapeJSON(payload)}"`;  //-CHANGE
      sendMessage(message);
      break;
    case "l3rdPull":
      payload = {
        state: "stop"
      };
      message = `CG 2-1 UPDATE 1 "${escapeJSON(payload)}"`; //-CHANGE
      sendMessage(message);
      break;
    default:
      message = '';
      payload = {};
      console.error("IPC switch has fallen through to default case");
      break;
  }
});
