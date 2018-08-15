var fs = require('fs');
var path = require('path');
var animationMenu = require('./animationMenu.js');
var jeff = require('../jeff');
var electron = require('electron');
var remote = electron.remote;
var dialog = remote.dialog;
var exportParams = require('./exportParams');
var exportParamsUI = require('./exportParamsUI');
var fileMenu = require('./fileMenu');
var domUtils = require('./domUtils');
var createDom = domUtils.createDom;
var createDiv = domUtils.createDiv;
var clickable = domUtils.clickable;

var dropArea  = createDiv('dropArea');
var DROP_HERE_TEXT = 'Drop .swf here';
var PROCESSING_TEXT = 'Processing files...';
dropArea.innerText = DROP_HERE_TEXT;

var loadedSWFs = [];

var viewer = null;
exports.setViewer = function (animationViewer) {
	viewer = animationViewer;
  fileMenu.setViewer(animationViewer);
};

function convertFiles (filePaths, outDir) {

  var jeffParams = {
    source: filePaths,
    inputDir: '',
    outDir: outDir,
    verbosity: 5,
    ignoreImages: exportParams.ignoreImages.value || 'placeholder'
  };

  for (var option in exportParams) {
    if (jeffParams[option] === undefined) {
      jeffParams[option] = exportParams[option].value;
    }
  }

  dropArea.innerText = PROCESSING_TEXT;
  jeff(jeffParams, function (error, extractionLog, result) {
    dropArea.innerText = DROP_HERE_TEXT;
    if (error) {
      console.error(error);
      alert('An error occured: ' + error);
      return;
    }

    if (outDir) {
      alert('Converted ' + extractionLog.files + ' files (with ' + extractionLog.errors + ' errors)');
    } else {
      loadedSWFs = loadedSWFs.concat(extractionLog.filePaths);
      var animationsData = viewer.processAnimationData(result);
      fileMenu.addFiles(animationsData);
    }
  });
}

/***************************/
/* SWF drag and drop logic */
/***************************/

function onDragOver(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function onDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  dropArea.style.borderColor = '';

  if (!viewer) {
    return;
  }

  var animationFiles = e.dataTransfer.files;

  var jeffFilePaths = [];
  var swfFilePaths = [];
  for (var f = 0; f < animationFiles.length; f += 1) {
    var animationPath = animationFiles[f].path;

    // if path is a directory, convert it into an glob expression
    if (fs.lstatSync(animationPath).isDirectory()) {
      convertFiles(animationPath + '/*.swf', null);
      continue;
    }

    if (animationPath.indexOf('.swf') !== -1) {
      swfFilePaths.push(animationPath);
      continue;
    }

    var jsonExtensionIndex = animationPath.indexOf('.json');
    if (jsonExtensionIndex !== -1) {
      jeffFilePaths.push(animationPath.substring(0, animationPath.lastIndexOf('/')));
      continue;
    }

    if (animationPath.indexOf('.fla') !== -1) {
      alert('Flash files need to be published under swf formats.');
      continue
    }

    var errorMessage = 'Could not identify file format: ' + animationPath;
    console.error(errorMessage);
    alert(errorMessage);
  }

  // Loading and converting swf files
  if (swfFilePaths.length > 0) {
   convertFiles(swfFilePaths, null);
  }

  // Loading already converted files
  if (jeffFilePaths.length > 0) {
    viewer.loadAnimations(jeffFilePaths, function (animationsData) {
      fileMenu.addFiles(animationsData);
    });
  }
}

document.body.addEventListener('dragover', onDragOver, false);
document.body.addEventListener('drop', onDrop, false);
document.addEventListener('dragover', onDragOver);
document.addEventListener('drop', onDrop);

dropArea.addEventListener('dragenter', function () {
  dropArea.style.borderColor = 'cyan';
});

dropArea.addEventListener('dragleave', function () {
  dropArea.style.borderColor = '';
});

/***************************/
/* SWF file saving logic */
/***************************/

var outputOptions = createDiv('outputOptions', exportParamsUI);
createDiv('outputDirectoryCaption', outputOptions).innerText = 'Output directory';
var outputDirectory = createDiv('outputDirectory', outputOptions);
var isDirectorySelectionDialogOpen = false;
outputDirectory.innerText = 'Select output directory';
outputDirectory.addEventListener('click', function () {
	if (isDirectorySelectionDialogOpen) {
		return;
	}

	var options = {
		title: 'select location',
		defaultPath: './',
		buttonLabel: 'select',
		properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
	};

	isDirectorySelectionDialogOpen = true;
	dialog.showOpenDialog(options, function (fileNames) {
		isDirectorySelectionDialogOpen = false;

		if (!fileNames || !fileNames[0]) {
			return;
		}

		var fileName = fileNames[0];
		outputDirectory.innerText = fileName;
		exportParams.outDir.value = fileName;
	});
});


var saveButton = createDiv('saveButton', outputOptions);
saveButton.innerText = 'Save';
saveButton.addEventListener('click', function () {
  if (!exportParams.outDir.value) {
    alert('Output directory needs to be specified!');
    return;
  }
  convertFiles(loadedSWFs, exportParams.outDir.value);
});


var clearAnimations = createDiv('clearButton', outputOptions);
clearAnimations.innerText = 'Clear Animations';
clearAnimations.addEventListener('click', function () {
  fileMenu.clearFiles();
  loadedSWFs = [];
});


exportParamsUI.appendChild(fileMenu.rootElement);

exports.dropArea = dropArea;
exports.animationMenu = require('./animationMenu.js');
exports.exportParamsUI = require('./exportParamsUI');
