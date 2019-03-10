const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage
} = require('electron');
let path = require("path");

if (process.env.NODE_ENV != "dev") {
  process.env.NODE_ENV = "prod"
}

// console.log(process.env);
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
  // Create the browser window.

  if (process.env.NODE_ENV == "prod") {
    var menu = Menu.buildFromTemplate([{
      label: 'Menu',
      submenu: [{
          label: 'Go to Lobby',
          click() {
            win.webContents.send("back-to-lobby");
          }
        },
        {
          label: 'Exit',
          click() {
            app.quit()
          }
        }
      ]
    }])
    Menu.setApplicationMenu(menu);
  }else{
    var menu = Menu.buildFromTemplate([{
      label: 'Menu',
      submenu: [{
          label: 'Go to Lobby',
          click() {
            win.webContents.send("back-to-lobby");
          }
        },
        {
          label: 'Exit',
          click() {
            app.quit()
          }
        },
        {
          label: 'Dev Tool',
          role:"toggledevtools"
        },{
          label:"Reload",
          role:"forcereload"
        }
      ]
    }])
    Menu.setApplicationMenu(menu);
  }


  // const appIcon = new Tray('icons/iconpng_64x64.png');
//  / console.log(path.join(__dirname, "icons/iconpng_64x64.png"))
  let configs = {
    show: false ,
    webPreferences: {
      nodeIntegration: true
    },
    icon: __dirname+"/images/spade.png"
  }
  configs.webPreferences.devTools = process.env.NODE_ENV == "prod" ? false : true;

  win = new BrowserWindow(configs)

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()

  win.maximize();
  win.once('ready-to-show',()=>{
    console.log("ready to show");
    win.show();
  })

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
    app.quit();
  })

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
