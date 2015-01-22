export default function JXML() {}

import JXMLComponent from 'jx/ui/JXMLComponent';

var implementation_map = {};
var ComponentsMap = {};

var components = {}, // God object
	next_uid = 1;

/**
 * Always use JXML.create to instantiate JXML components.
 */
JXML.create = function(renderer, module, uid, attr) {
	// TODO: allow module overwrites by different renderers

	var element = new JXMLComponent(renderer, module, uid, attr);

	components[uid] = element;

	return element;
}

JXML.import = function(name, cb) {
	if (!name) throw 'Module name required';
	System.import(name + '.jxml!').then(cb);
}

/**
 * A safe method to communicate with other components or modules.
 * `args` will be sanitized through JSON.
 */
JXML.cast = function(uid_or_module, method, args) {
	args = JSON.parse(JSON.stringify());
	method += '';

	if (typeof uid_or_module == 'number') {
		var component = components[uid_or_module];

		if (component) {
			component[method].apply
		}

	}
	else
		throw 'TODO: implement me!';
}

/**
 * Merges map `src` into `dst`. Will not retain references
 * to any value in `src`.
 *
 * > a = {}, b = { moo: { cow: 42 } }, deepMerge(a, b), a.moo == b.moo
 * false
 */
JXML.deepMerge = function deepMerge(dst, src) {
	for (var k in src) {
		var v = src[k];

		if (v && typeof v == 'object') {
			if (typeof dst[k] == 'object')
				deepMerge(dst[k], v);
			else
				deepMerge(dst[k] = {}, v);
		}
		else
			dst[k] = v;
	}
}
