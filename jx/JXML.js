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
 * to any value in `src`. Null or { '': true } values mean
 * "delete this key."
 *
 * > a = {}, b = { moo: { cow: 42 } }, deepMerge(a, b), a.moo == b.moo
 * false
 */
JXML.deepMerge = function deepMerge(dst, src) {
	for (var k in src) {
		var v = src[k];

		if (v == null)
			delete dst[k];
		else if (v && typeof v == 'object') {
			if (typeof dst[k] == 'object' && ! ('' in v) )
				deepMerge(dst[k], v);
			else
				deepMerge(dst[k] = {}, v);
		}
		else
			dst[k] = v;
	}
}

/**
 * Same as deepMerge but usage intention is for merging diffs.
 * Nulls and { '': true }s are normalized and propageted to
 * `diff_dst`.
 */
JXML.diffMerge = function diffMerge(diff_dst, diff_src) {
	for (var k in diff_src) {
		var v = diff_src[k];

		if (v && typeof v == 'object') {
			if (diff_dst === undefined) debugger
			if ('' in v || ! (k in diff_dst) )
				diff_dst[k] = {};
			else if (k in diff_dst && diff_dst[k] == null)
				diff_dst[k] = { '': true }; // Save deletion

			diffMerge(diff_dst[k], v);
		}
		else
			diff_dst[k] = v;
	}
}
/**
 * Same as deepMerge but returns data that actually changed.
 * Null or { '': true } values mean "delete this key" and are
 * propagated to the diff.
 */
JXML.mergeDiff = function mergeDiff(dst, src) {
	var diff;

	for (var k in src) {
		if (k == '') continue; // ignore, handled in parent

		var v = src[k], d;

		if (v == null) { // deleting a key
			delete dst[k];
			( diff || (diff = {}) )[k] = null;
			continue;
		}

		if (typeof v != 'object') { // primitive
			if (v !== dst[k]) // only if different
				( diff || (diff = {}) )[k] = dst[k] = v;
			continue;
		}

		if ('' in v && k in dst) { // blow away existing keys
			d = mergeDiff(dst[k] = {}, v);
			if (d) {
				( diff || (diff = {}) )[k] = d;
				d[''] = true;
			}
			else
				( diff || (diff = {}) )[k] = null;

			continue;
		}

		if (k in dst)
			d = mergeDiff(dst[k], v);
		else
			d = mergeDiff(dst[k] = {}, v);

		if (d)
			( diff || (diff = {}) )[k] = d;
	}

	return diff;
}
