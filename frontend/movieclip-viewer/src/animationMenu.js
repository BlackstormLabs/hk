var DOCUMENT_BODY = document.getElementsByTagName('body')[0];

var assetViewer;
function setViewer (viewer) {
  assetViewer = viewer;
}

function createDiv (className, parent) {
  parent = parent || DOCUMENT_BODY;
  var dom = document.createElement('div');
  dom.parent = parent;
  parent.appendChild(dom);
  if (className) dom.className = className;
  return dom;
};

function removeDom (dom) {
  dom.parent.removeChild(dom);
};

function makeButton (dom, onClick) {
  dom.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    e.preventDefault();
    onClick(dom);
  });
};

var currentSelection = null;
function onAssetClicked (assetButton) {
  if (currentSelection) {
   currentSelection.className = 'animationItem animation';
  }

  currentSelection = assetButton;
  currentSelection.className = 'animationItem animationSelected';

  assetViewer.playAnimation(assetButton.assetID);
};

function onCenteringButtonClicked (centeringButton) {
  if (assetViewer.isAnimationCentered) {
    centeringButton.innerText = 'Center animation';
    assetViewer.centerAnimationOrigin();
  } else {
    centeringButton.innerText = 'Center animation origin';
    assetViewer.centerAnimation();
  }
}

function createMenu() {
  var menu = createDiv('animationMenu');
  if (window.devicePixelRatio > 1) {
    menu.style.zoom = Math.round(window.devicePixelRatio * 100) + '%';
  }
  return menu;
}

var menu = createMenu();
var header = createDiv('animationHeader', menu);
header.innerText = 'Animation List';
var assetList = createDiv('animationList', menu);
var centeringButton = createDiv('animationCentering', menu);
centeringButton.innerText = 'Center animation origin';
makeButton(centeringButton, onCenteringButtonClicked);

function addAssetButton (assetName, assetID) {
  var assetButton = createDiv('animationItem animation', assetList);
  assetButton.innerText = assetName;
  assetButton.assetID = assetID;
  makeButton(assetButton, onAssetClicked);
}

function addList (listOfAssets) {
  removeDom(assetList);
  assetList = createDiv('animationList', menu);

  // making sure the centering button remains at the bottom
  removeDom(centeringButton);
  menu.appendChild(centeringButton);

  // reorganizing by folder name
  var folders = {};
  var animationNames = [];
  for (var a = 0; a < listOfAssets.length; a += 1) {
    var assetName = listOfAssets[a];
    var nameIdx = assetName.lastIndexOf('/');
    if (nameIdx !== -1) {
      var folderName = assetName.substring(0, nameIdx);
      var folder = folders[folderName];
      if (!folder) {
        folder = folders[folderName] = [];
      }
      folder.push(assetName.substring(nameIdx + 1));
    } else {
      addAssetButton(assetName, assetName);
    }
  }

  var folderNames = Object.keys(folders);
  folderNames.sort();
  for (var f = 0; f < folderNames.length; f += 1) {
    var folderName = folderNames[f];
    var folderDiv = createDiv('animationItem animationFolder', assetList);
    folderDiv.innerText = folderName;

    var animations = folders[folderName];
    for (var a = 0; a < animations.length; a += 1) {
      var assetName = animations[a];
      addAssetButton(assetName, folderName + '/' + assetName);
    }
  }

  return assetList;
}

exports.setViewer = setViewer;
exports.addList = addList;
exports.rootElement = menu;

