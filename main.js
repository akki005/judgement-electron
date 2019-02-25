const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
require('electron-reload')(__dirname);
let http = require("http");
let path = require("path");
let os = require("os");
let socket_io = require("socket.io");
let game_main = require("./src/main");
let server;
let io;


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1281,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, "images/playing-cards-assets/png/A_of_spades.png")
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
  game_main.init(win);

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("start-game", () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-type': 'text/plan'
    });
    res.write('Hello Node JS Server Response');
    res.end();
  });
  let ips = os.networkInterfaces();
  let ip = ips.wlp4s0[0].address;
  let port = 8080;
  io = socket_io(server);
  server.listen(port, ip);
  server.on("error", (error) => {
    console.error(error);
  });
  server.on("listening", () => {
    console.log(`server started on ${ip}:${port}`);
    win.webContents.send("started-game", {
      ip,
      port
    });
  })
  io.on("connection", (socket) => {
    console.log("connection requested");

    let player = undefined;

    socket.on("disconnect", () => {
      if (player) {
        console.log(`Player ${JSON.stringify(player)} disconnected`);
        win.webContents.send("player-disconnect", {
          player_name: player.name,
          player_id: player.id
        });
      } else {
        console.log("someone left");
      }
    })
    socket.on("join-game", (player_data) => {
      if (player_data && player_data.name && player_data.id) {
        player = player_data;
        let player_name = player_data.name;
        let player_id = player_data.id;
        console.log(`player rqeuest ${JSON.stringify(player_data)}`);
        win.webContents.send("player-join-request", {
          player_name,
          player_id
        });
      } else {
        socket.disconnect(true);
      }
    })



    ipcMain.on("reject-player-connection", () => {
      socket.emit("maximum-players-reached");
      socket.disconnect(true);
    })
  })
})

ipcMain.on("kill-server", () => {
  io.close();
  server.close();
  console.log("killed server");
  win.webContents.send("server-killed");
})
