/*jshint esversion: 6 */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require('url');
const {log, logObj, logs, logEvent} = require('xeue-logs');
const fs = require('fs');

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

  mainWindow.once("ready-to-show", async () => {
    mainWindow.show();
    launchIntervalConnect();
    log("Main window loaded");
    const l3rdData = await getObject('l3rdData');
    const judgeData = await getObject('judgeData');
    const identData = await getObject('identData');
    mainWindow.webContents.send('l3rdLoad', l3rdData);
    mainWindow.webContents.send('judgeLoad', judgeData);
    mainWindow.webContents.send('identLoad', identData);
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
let errorCount = 0;
let intervalConnect = false;
const casparTimeout = 5000;

//Connect to Caspar Server
function casparConnect() {
  log("Connecting", ['C','CASPER', logs.p]);
  stream.connect(casparPort, casparIP);
};

//Reconnection functions - will try to reconnect every 5 seconds.
function launchIntervalConnect() {
  log("Starting connection loop", ['C','CASPER', logs.p]);
  if (false != intervalConnect) return;
  store = {header: 'CG-CONNECTION', value: 'CONNECTING'};
  sendToClient(store);
  intervalConnect = setInterval(casparConnect, casparTimeout);
};

function clearIntervalConnect() {
  if (false == intervalConnect) return;
  clearInterval(intervalConnect);
  intervalConnect = false;
};

//Message helper
function sendMessage(command) {
  let commandBuffer = Buffer.from(command + "\r\n", "utf8");
  stream.write(commandBuffer);
  if (command.indexOf('"{') !== -1) {
    log("Command sent: " + command.substring(0, command.indexOf('"{')), ['C','CASPER', logs.p]);
    const commandData = command.substring(command.indexOf('"{')+1, command.length-1);
    const commandStripped = commandData.replace(/\\/g,"");
    logObj("Update data", JSON.parse(commandStripped), ['C','CASPER', logs.p]);
  } else {
    log("Command sent: " + command, ['C','CASPER', logs.p]);
  }
};

function casparDataHandler(data) {
  let dataAsString = data.toString().replace(/^[\s\t]*(\r\n|\n|\r)/gm, "");
  log("Data from server: " + dataAsString, ['C','CASPER', logs.p]);
  store = {header: 'CG-RECEIVED-DATA', value: dataAsString};
  sendToClient(store);
};

stream.on("connect", () => {
  clearIntervalConnect();
  log(`Connected to Caspar Server ${casparIP}:${casparPort}`, ['C','CASPER', logs.p]);
  errorCount = 0;
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

stream.on("error", (err) => {
  errorCount += 1;
  logs.error(`CASPAR Connection Attempt failed (${errorCount}) - ${err.code}`);
  store = {header: 'CG-CONNECTION', value: 'ERROR'};
  sendToClient(store);
});

stream.on("data", (data) => {
  casparDataHandler(data);
});

stream.on("close", ()=> casperEnabled ? launchIntervalConnect() : sendStringToClient("Caspar stream disconnected and disabled, will not reconnect"));
stream.on("end", ()=> casperEnabled ? launchIntervalConnect() : sendStringToClient("Caspar stream disconnected and disabled, will not reconnect"));

//if (casperEnabled) casparConnect();


//IPC Listener

//Escaping function
function escapeJSON(object) {
  let objectJSON = JSON.stringify(object);
  return objectJSON.replace(/"/g, '\\"');
}

function playIdent() {
  sendMessage(`PLAY 2-10 "IDENT" CUT 1 Linear RIGHT`);
}

function playClip(clip) {
  sendMessage(`PLAY 2-11 "${clip.toUpperCase()}" CUT 1 Linear RIGHT`);
}


function clearClip() {
  sendMessage(`CLEAR 2-11`);
}

ipcMain.on('casparCommand', (event, data) => {
  let payload = {};
  switch (data.command) {
    case "unis":
      payload = {
        state: "unis",
        data: data.data
      };
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "load":
      sendMessage(`CLEAR 1`);
      sendMessage(`PLAY 1-1 "lOOP" CUT 1 Linear RIGHT`);
      sendMessage(`CG 1-2 ADD 1 "UNIVISION/SCORES" 1`);
      break;
    case "stop":
      payload = {
        state: "stop"
      };
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      setTimeout(playIdent, 500);
      break;
    case "cueJudge":
      payload = {
        state: "reset"
      };
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      setTimeout(function(){
        playClip("IDENTS/"+data.judge);
      }, 500);
      break;
    case "reset":
      payload = {
        state: "reset"
      };
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      setTimeout(playIdent, 500);
      //setTimeout(clearIdent, 3500);
      break;
    case "clear":
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON({state: "clear"})}"`);
      sendMessage(`CG 1-3 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      sendMessage(`CG 2-1 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      sendMessage(`CG 1-4 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      break;
    case "ident":
      playIdent();
      break;
    case "clip":
      playClip(data.data);
      break;
    case "clipClear":
      clearClip();
      break;
    case "clearAll":
      sendMessage(`CLEAR 1`);
      sendMessage(`CLEAR 2`);
      break;
    case "pushScore":
      payload = data;
      payload.state = "update";
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "pullScore":
      payload = data;
      payload.state = "downdate";
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "selectJudge":
      payload = data;
      payload.state = "judge";
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "selectPublic":
      payload = data;
      payload.state = "public";
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "reorder":
      sendMessage(`CG 1-2 UPDATE 1 "${escapeJSON({state: "reorder"})}"`);
      break;
    case "actsPush":
      sendMessage(`CG 1-3 UPDATE 1 "${escapeJSON({state: "start"})}"`);
      break;
    case "actsStart":
      sendMessage(`CG 1-3 ADD 1 "UNIVISION/ACTS" 1`);
      break;
    case "actsPull":
      sendMessage(`CG 1-3 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      setTimeout(function(){
        sendMessage(`CG 1-3 STOP 1`);
      },2000);
      break;
    case "creditsPush":
      sendMessage(`CG 2-11 ADD 1 "UNIVISION/CREDITS" 1`);
      break;
    case "creditsPull":
      sendMessage(`CG 2-11 STOP 1`);
      break;
    case "timerPush":
      sendMessage(`CG 1-4 ADD 1 "UNIVISION/COUNT" 1 "${escapeJSON({state: "start"})}"`);
      break;
    case "timerPull":
      sendMessage(`CG 1-4 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      break;
    case "l3rdJudge":
      payload = {
        state: "startJudge",
        judge: data.judge
      };
      sendMessage(`CG 2-1 ADD 1 "UNIVISION/L3RD" 1 "${escapeJSON(payload)}"`);
      break;
    case "l3rd":
      payload = {
        state: "start",
        name: data.name,
        role: data.role
      };
      sendMessage(`CG 2-1 ADD 1 "UNIVISION/L3RD" 1 "${escapeJSON(payload)}"`);
      break;
    case "l3rdQuiz":
      payload = {
        state: "quiz",
        left: data.left,
        right: data.right,
        leftText: data.leftText,
        rightText: data.rightText
      };
      sendMessage(`CG 2-1 UPDATE 1 "${escapeJSON(payload)}"`);
      break;
    case "l3rdPull":
      sendMessage(`CG 2-1 UPDATE 1 "${escapeJSON({state: "stop"})}"`);
      break;
    default:
      logs.error("IPC switch has fallen through to default case");
      break;
  }
});

ipcMain.on('l3rdSave', (event, data) => {
  log("Getting lower third data to save");
  saveObject(data, 'l3rdData');
});

ipcMain.on('identSave', (event, data) => {
  log("Getting ident/clip data to save");
  saveObject(data, 'identData');
});

ipcMain.on('judgeSave', (event, data) => {
  log("Getting judge names data to save");
  saveObject(data, 'judgeData');
});


async function saveObject(object, fileName) {
  console.log();
  await fs.promises.writeFile(`${app.getPath("userData")}/${fileName}.json`, JSON.stringify(object));
}

async function getObject(fileName) {
  try {
    const buffer = await fs.promises.readFile(`${app.getPath("userData")}/${fileName}.json`);
    return JSON.parse(buffer.toString());
  } catch (error) {
    logs.warn("No file data found for: "+fileName);
    return [];
  }
}