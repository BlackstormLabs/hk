var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;

ipcRenderer.on('argv', function () {
	// start Jeff in GUI mode
	require('./gui');
});
