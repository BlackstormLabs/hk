//handle setupevents as quickly as possible
const setupEvents = require('./setupEvents');
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

const electron = require('electron')
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
var path = require('path');

require('electron-context-menu')();

let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1265,
    height: 630,
    minWidth: 1265,
    minHeight: 630,
    maxWidth: 1265,
    maxHeight: 630,
    backgroundColor: '#312450',
    resizable: true,
    icon: path.join(__dirname, 'assets/icons/png/64x64.png')
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools({ detach: true });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Show the mainwindow when it is loaded and ready to show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit();
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
