import JXML from 'jx/JXML';

/**
 * JXMLComponent represents a JXML component. Components are sandboxed:
 * communication between components is via message passing, mainly by
 * setting attributes.
 *
 * JXMLComponent functions should not return values as their methods may be
 * dispatched asynchronously.
 */
export default function JXMLComponent(renderer, module, uid, attr) {
	this.renderer  = renderer;
	this.uid       = uid;
	this.module    = module;
	this.resolved  = false;

	this.unresolved_attr = {};
	this.attr = {};

	if (attr)
		this.setAttr(attr);
}

JXMLComponent.prototype.resolve = function() {
	if (this.resolved || this.resolving) return;

	this.resolving = true;

	var self = this;

	JXML.import(this.module, function(module) {
		self.resolving = false;

		var component = module.default;

		self.resolved = new component(self);

		if (self.resolved.template) {
			// this is a JXMLComponent
			var attr = self.resolved.template;

			var root = self.root = self.create(attr.module, attr);

			self.resolved.init && self.resolved.init();

			if (self.visible != false) // defaults to visible
				self.show();
		}
		else {
			// This is a rendering component
			self.resolved.init && self.resolved.init();
		}

		self.applyAttr(self.unresolved_attr);
		self.unresolved_attr = null;
	});
}

JXMLComponent.prototype.show = function() {
	if (this.visible) return;

	this.visible = true;

	if (!this.resolved)
		this.resolve();
	else
		this.root && this.root.show();
}

JXMLComponent.prototype.create = function(module, attr, child_key) {
	attr = attr || {};

	var uid;

	if (child_key) // Creating a child component
		uid = this.uid.replace(/:.*/, '') + ' ' + child_key;
	else // Creating the superclass component
		uid = this.uid + ':' + module;

	// TODO: allow module overwrites
	var element = JXML.create(this.renderer, module, uid, attr);

	return element;
}

JXMLComponent.prototype.destroy = function() {
	if (this.root)
		this.root.destroy();
	else {
		var children = this.children, k;

		for (k in children)
			children[k].destroy();

		this.onDirty(null);
	}
}

/**
 * Communicate with components mainly by setting attributes.
 *
 * Two types of components: Documents and (Render) Elements
 *
 * 1) Documents
 * Documents have internal structure. They have a chance to mangle
 * attributes before their root component receives the attributes.
 *
 * 2) Render Elements
 * Render elements translate attributes to renderable properties.
 * Renderable properties are defined by specific renderers. The
 * default HTML and Canvas renderers accept properties like x, y,
 * width, height, background and text.
 *
 */
JXMLComponent.prototype.setAttr = function(delta) {
	delta = copy(delta);

	// Transform external children
	// TODO: handle slot/placement here

	if (delta.children) {
		var delta_children = {};

		for (var k in delta.children)
			delta_children['Z' + k] = delta.children[k];

		delta.children = delta_children;
	}

	// show if true or not explicitly hidden
	// TODO converting to string seems hacky
	if ( ! /false/.test(delta.visible) )
		this.show();

	if (this.resolved)
		this.applyAttr(delta);
	else // component unresolved, save for later
		JXML.diffMerge(this.unresolved_attr, delta);
}

JXMLComponent.prototype.applyAttr = function(delta) {
	if (this.root) { // component has internal structure
		delta = JXML.mergeDiff(this.attr, delta);

		if (!delta) return; // nothing changed

		// Expand braces TODO: optimize
		if (this.resolved.expandBraces) {
			var brace_delta = this.resolved.expandBraces(this.attr);

			brace_delta = JXML.mergeDiff(this.attr, brace_delta);
			JXML.deepMerge(delta, brace_delta);
		}

		// Allow component to mangle attributes
		if (this.resolved.onAttr && delta)
			this.resolved.onAttr(this.attr, delta);

		// TODO: onAttr should return a diff instead of mangling delta

		// Pass mangled attributes to root / 'superclass'
		this.root.setAttr(delta);

	}
	else {
		// Component is a rendering element
		var delta_children = delta.children;

		// Children are special and not passed to component
		delete delta.children;

		// Component is expected to return a renderlist/dirty
		var dirty = this.resolved.render(delta, this.attr);

		if (delta_children) {
			// Handle children from attributes delta
			var dirty_children = this.applyChildrenAttr(delta_children);

			if (dirty_children) {
				dirty = dirty || {};
				dirty.children = dirty_children;
			}
		}

		if (!isEmpty(dirty))
			this.onDirty(dirty);
	}
}

JXMLComponent.prototype.applyChildrenAttr = function(delta_children) {
	var children = this.children = this.children || {},
		dirty_children = {},
		dirty;

	for (var k in delta_children) {
		var
			child = delta_children[k],
			child_uid = this.uid.replace(/:.*/, '') + ' ' + k;

		if (!child) { // child is being removed
			if (children[k]) {
				// signal child for great destruction
				children[k].destroy();
				delete this.children[k];
				dirty_children[child_uid] = null;
				dirty = true;
			}
		}
		else { // child is being added or modified
			if (children[k]) // modification
				children[k].setAttr(child);
			else { // creation
				children[k] = this.create(child.module, child, k);
				dirty_children[child_uid] = true;
				dirty = true;
			}
		}
	}

	return dirty && dirty_children;
}

JXMLComponent.prototype.onDirty = function(dirty) {
	var dirtylist = {};

	dirtylist[this.uid.replace(/:.*/, '')] = copy(dirty);
	this.renderer.onDirty(dirtylist);
}

JXMLComponent.prototype.handle_cast = function(method, args) {
	if (this.resolved)
		this.resolved.handle_cast(method, args);

	// TODO: handle the case where we get messages but can't
	//       process them due to being unresolved
}

/**
 * Makes a deep JSON-serializable no-reference copy of given object
 */
function copy(obj) {
	return JSON.parse(JSON.stringify(obj));
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

/**
 * Return true if `object` or its prototype has properties
 *
 * > isEmpty({})
 * true
 *
 * > isEmpty({ moo: 42 })
 * false
 */
function isEmpty(object) {
	for (var k in object)
		return false;

	return true;
}
