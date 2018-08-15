var gui = require('./gui');

require('../js-builds/viewer.js');
var AssetViewer = window.AssetViewer;

var viewer = new AssetViewer({
  // backgroundColor: '#ddd',
  menu: gui.animationMenu,
  top: 10,
  left: 275,
  width: 500,
  height: 588
});

gui.setViewer(viewer);

// Super awesome layouting

gui.animationMenu.rootElement.style.top = 2 + 'px';
gui.animationMenu.rootElement.style.left = 2 + 'px';

gui.dropArea.style.position = 'absolute';
gui.dropArea.style.top = 0 + 'px';
gui.dropArea.style.left = 270 + 'px';

gui.exportParamsUI.style.position = 'absolute';
gui.exportParamsUI.style.top = 0 + 'px';
gui.exportParamsUI.style.left = 770 + 'px';