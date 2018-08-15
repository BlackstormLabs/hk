var exportParams = require('./exportParams');
var domUtils     = require('./domUtils');
var createDom    = domUtils.createDom;
var createDiv    = domUtils.createDiv;
var clickable    = domUtils.clickable;

var jeffOptions = createDiv('jeffOptions');


function createOptionEntry(id, def) {
	var optionEntry = createDiv('jeffOption', jeffOptions);
	var title = createDiv('jeffOption-title', optionEntry);
	title.innerText = id;

	var container = createDiv('jeffOption-container', optionEntry);

	var description = createDiv('jeffOption-description', optionEntry);
	description.innerText = def.desc || '';

	return container;
}

function createToggle(id, def) {
	var container = createOptionEntry(id, def);

	var input = createDom('input', 'checkbox', container);
	input.type = 'checkbox';
	input.checked = exportParams[id].value;
	input.addEventListener('change', function onChange() {
		exportParams[id].value = !!input.checked;
	});
}

function createDropdown(id, def) {
	var container = createOptionEntry(id, def);
	var dropdown = createDom('select', 'dropdown', container);
	for (var i = 0; i < def.values.length; i++) {
		var option = createDom('option', null, dropdown);
		var value = def.values[i];
		option.value = value;
		option.innerText = value;
	}

	dropdown.addEventListener('change', function onChange() {
		exportParams[id].value = dropdown.value;
	});
}

function createNumberInput(id, def) {
	var container = createOptionEntry(id, def);
	var input = createDom('input', 'numberInput', container);
	input.type = 'number';
	input.value = exportParams[id].value;
	input.addEventListener('change', function onChange() {
		var value = input.value;
		if (value <= 0) value = 1; // all Jeff number are strictly positive
		if (def.isInteger) value = Math.round(value);
		input.value = value;
		exportParams[id].value = value;
	});
}

var CONTRUCTOR_BY_TYPE = {
	toggle:   createToggle,
	dropdown: createDropdown,
	number:   createNumberInput
};

for (var id in exportParams) {
	var def = exportParams[id];
	if (def.type) {
		CONTRUCTOR_BY_TYPE[def.type](id, def);
	}
}

module.exports = jeffOptions;
