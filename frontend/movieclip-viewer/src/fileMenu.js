var DOCUMENT_BODY = document.getElementsByTagName('body')[0];

var viewer;
function setViewer (animationViewer) {
  viewer = animationViewer;
}

function createDiv(className, parent) {
  parent = parent || DOCUMENT_BODY;
  var dom = document.createElement('div');
  dom.parent = parent;
  parent.appendChild(dom);
  if (className) dom.className = className;
  return dom;
};

function removeDom(dom) {
  dom.parent.removeChild(dom);
};

function makeButton(dom, onClick) {
  dom.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    e.preventDefault();
    onClick(dom);
  });
};

var menu = createDiv('fileMenu');
var fileDivs = [];

function getActiveAnimations () {
  var activeAnimationsData = [];
  for (var f = 0; f < fileDivs.length; f += 1) {
    var fileDiv = fileDivs[f];
    if (fileDiv.isFileActive) {
      activeAnimationsData.push(fileDiv.animationData);
    }
  }
  return activeAnimationsData;
}

function resetAnimations () {
  viewer.resetAnimations();
  viewer.setAnimations(getActiveAnimations());
}

function onRemoveButtonClicked (removeButton) {
  removeDom(removeButton.parent);

  fileDivs.splice(fileDivs.indexOf(removeButton.parent), 1);

  resetAnimations();
}

function onToggleButtonClick (toggleButton) {
  var fileDiv = toggleButton.parent;
  var idx = fileDivs.indexOf(fileDiv);

  if (toggleButton.innerText === 'on') {
    fileDiv.isFileActive = false;
    toggleButton.innerText = 'off';
    toggleButton.className = 'fileItem fileInactive';
  } else {
    fileDiv.isFileActive = true;
    toggleButton.innerText = 'on';
    toggleButton.className = 'fileItem fileActive';
  }

  resetAnimations();
}

function addFileButton (animationData) {
  var fileName = animationData.url;
  var directoryIndex = fileName.lastIndexOf('/');
  if (directoryIndex !== -1) {
    fileName = fileName.substring(directoryIndex);
  }

  var fileDiv = createDiv('fileDiv', menu);
  fileDiv.animationData = animationData;
  fileDiv.isFileActive = true;
  fileDivs.push(fileDiv);

  var fileNameDiv = createDiv('fileItem fileName', fileDiv);
  fileNameDiv.innerText = fileName;

  var toggleButton = createDiv('fileItem fileActive', fileDiv);
  toggleButton.innerText = 'on';
  makeButton(toggleButton, onToggleButtonClick);

  var removeButton = createDiv('fileItem removeFile', fileDiv);
  removeButton.innerText = 'remove';
  makeButton(removeButton, onRemoveButtonClicked);
}

function addFiles(filesData) {
  // console.error('filesData', filesData)
  for (var f = 0; f < filesData.length; f += 1) {
    addFileButton(filesData[f]);
  }
}

function clearFiles () {
  fileDivs.forEach(function (fileDiv) { removeDom(fileDiv); });
  fileDivs = [];
  resetAnimations();
}

exports.setViewer = setViewer;
exports.addFiles = addFiles;
exports.clearFiles = clearFiles;
exports.rootElement = menu;

