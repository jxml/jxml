export default function JXML() {}

import JXMLComponent from 'jx/ui/JXMLComponent';

var components = {}, // God object
	casts        = [], // Deferred casts
	cast_timer;        // Set if cast handling scheduled

/**
 * Always use JXML.create to instantiate JXML components.
 */
JXML.create = function(renderer, module, uid, attr) {
	// TODO: allow module overwrites by different renderers
	uid = uid || 'root';

	var element = new JXMLComponent(renderer, module, uid, attr);

	components[uid] = element;

	return element;
}

JXML.destroy = function(uid) {
	var element = components[uid];

	if (element)
		delete components[uid];
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
	args = JSON.parse(JSON.stringify(args || {}));
	method += '';

	var component = components[uid];

	if (component) {
		casts.push([ component, method, args ]);
		if (!cast_timer) cast_timer = setTimeout(handle_casts, 50);
	}
}

function handle_casts() {
	for (var i = 0; i < casts.length; i++)
		casts[i][0].handle_cast(casts[i][1], casts[i][2]);

	casts = [];
	cast_timer = null;
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
 * Null or undefined values mean "delete this key" and are
 * propagated to the diff.
 */
JXML.mergeDiff = function mergeDiff(dst, src) {
	var diff;

	for (var k in src) {
		var v = src[k], d;

		if (v == dst[k]) continue;

		if (v == null) { // deleting a key
			delete dst[k];
			( diff || (diff = {}) )[k] = null;
		}
		else if (typeof v == 'object') {
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
