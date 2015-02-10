export default function JXML() {}

import JXMLComponent from 'jx/ui/JXMLComponent';

var components = {}; // God object

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
JXML.cast = function(uid, method, args) {
	args = JSON.parse(JSON.stringify());
	method += '';

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

/**
 * Same as deepMerge but returns data that actually changed.
 */
JXML.mergeDiff = function mergeDiff(dst, src) {
	var diff;

	for (var k in src) {
		var v = src[k], d;

		if (v == dst[k]) continue;

		if (v && typeof v == 'object') {
			if (typeof dst[k] == 'object')
				d = mergeDiff(dst[k], v);
			else
				d = mergeDiff(dst[k] = {}, v);

			if (d)
				( diff || (diff = {}) )[k] = d;
		}
		else
			( diff || (diff = {}) )[k] = dst[k] = v;
	}

	return diff;
}
