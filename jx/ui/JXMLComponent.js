import JXML from 'jx/JXML';

export default function JXMLComponent(module, owner, attr) {
	this.module    = module;
	this.owner_uid = owner && owner.uid;
	this.resolved  = false;
	deepMerge(this.attr = {}, attr);
}

JXMLComponent.prototype.resolve = function() {
	if (this.resolved) return;

	this.IDs = {};

	var self = this;

	JXML.import(this.module, function(module) {
		var component = module.default;

		self.resolved = new component(self);

		if (self.resolved.template) {
			// this is a JXMLComponent
			var root = self.root = self.cloneTemplate(self.resolved.template);

			var extChildren = self.attr && self.attr.externalChildren;

			if (extChildren) {
				for (var k in extChildren) {
					extChildren['Z' + k] = extChildren[k];
					delete extChildren[k];
				}
			}

			root.setAttr(self.attr);

			self.resolved.init && self.resolved.init();

			if (self.visible)
				self.show();
		}
		else {
			// This is a rendering component
			self.resolved.init && self.resolved.init();
		}
	});
}

JXMLComponent.prototype.show = function() {
	this.visible = true;

	if (!this.resolved)
		this.resolve();
	else
		this.root.show();
}

JXMLComponent.prototype.render = function() {
	if (!this.resolved)
		return;

	if (this.resolved.template)
		return this.root && this.root.render();
	else
		return this.resolved.render && this.resolved.render();
}

JXMLComponent.prototype.create = function(module, attr) {
	attr = attr || {};

	// TODO: allow module overwrites
	var element = JXML.create(module, this, attr);

	var id = attr.id;

	if (id) {
		if (this.IDs[id]) throw 'Duplicate ID';

		this.IDs[id] = element;
	}

	return element;
}

JXMLComponent.prototype.cloneTemplate = function(template) {
	var tag    = template[0],
		attr     = template[1],
		children = template[2];

	var element = this.create(tag, attr), child_elements = {};

	var text, children_index = 1;

	for (var i = 0; i < children.length; i++) {
		var child = children[i], child_element;

		if (typeof child == 'string')
			text = (text || '') + child;
		else {
			child_element = this.cloneTemplate(child, element);

			var key = toKey(children_index++);
			child_elements[key] = child_element;
		}
	}

	if (text)
		element.setAttr({ text: text });

	element.setAttr({ externalChildren: child_elements });

	return element;
}

JXMLComponent.prototype.setAttr = function(attr) {
	this.attr = this.attr || {}
	deepMerge(this.attr, attr);
}

/**
 * Merges map `src` into `dst`. Will not retain references
 * to any value in `src`.
 *
 * > a = {}, b = { moo: { cow: 42 } }, deepMerge(a, b), a.moo == b.moo
 * false
 */
function deepMerge(dst, src) {
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

function template() {
	var $ID = JXML.create($NAME, function(c) { $ID = c });
}

/**
 * A dubious function that takes a number and
 * returns a lexicographically sortable representation.
 * TODO: only supports 3844 keys :(
 *
 * > toKey(42)
 * "0G"
 */
var KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), KEYS_LENGTH = KEYS.length;

function toKey(n) {
	return KEYS[n / KEYS_LENGTH | 0] + KEYS[n % KEYS_LENGTH];
}
