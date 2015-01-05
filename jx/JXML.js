export default function JXML() {}

import JXMLComponent from 'jx/ui/JXMLComponent';

var implementation_map = {};
var ComponentsMap = {};

var components = {}, // God object
	next_uid = 1;

/**
 * Always use JXML.create to instantiate JXML components.
 */
JXML.create = function(module, owner, attr) {
	// TODO: allow module overwrites by different renderers

	var element = new JXMLComponent(module, owner, attr);

	element.uid = next_uid;
	components[next_uid++] = element;

	return element;
}

JXML.import = function(name, cb) {
	if (!name) throw 'Module name required';
	System.import(name + '.jxml!').then(cb);
}
