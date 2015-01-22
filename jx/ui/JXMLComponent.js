import JXML from 'jx/JXML';

/**
 * JXMLComponent represents a JXML component. Components are sandboxed:
 * communication between components is via message passing mainly by
 * setting attributes.
 *
 * JXMLComponent functions should not return values as their methods may be
 * dispatched asynchronously.
 */
export default function JXMLComponent(renderer, module, uid, attr) {
	this.renderer   = renderer;
	this.uid        = uid;
	this.module     = module;
	this.resolved   = false;

	// TODO: go through setAttr?
	// where to put dirty stuff? always notify? or keep
	// locally until requested?
	//deepMerge(this.attr = {}, attr);
	console.log('CONSTRUCTOR', module, attr);
	if (attr)
		this.setAttr(attr);

	this.unresolved_attr = {};
}

JXMLComponent.prototype.resolve = function() {
	//console.log('resolve', this.module);
	if (this.resolved) return;

	this.IDs = {};

	var self = this;

	JXML.import(this.module, function(module) {
		var component = module.default;

		self.resolved = new component(self);

		console.log('resolved', self.module);

		if (self.resolved.template) {
			// this is a JXMLComponent
			var attr = self.resolved.template;
			console.log('my own attributes', attr);
			console.log('my external attributes', self.unresolved_attr);

			/*console.log('about to create',
				self.module,
				attr
			);*/

			var root = self.root = self.create(attr.module, attr);

			/*var extChildren = self.attr && self.attr.externalChildren;

			if (extChildren) {
				for (var k in extChildren) {
					extChildren['Z' + k] = extChildren[k];
					delete extChildren[k];
				}
			}*/

			self.resolved.init && self.resolved.init();

			if (self.visible)
				self.show();
		}
		else {
			console.log('resolve: I am a rendering component');
			console.log('Someone should set my attributes shortly');
			// This is a rendering component
			self.resolved.init && self.resolved.init();
		}

		self.setAttr(self.unresolved_attr);
		self.unresolved_attr = null;
	});
}

JXMLComponent.prototype.show = function() {
	this.visible = true;

	if (!this.resolved)
		this.resolve();
	else
		this.root.show();
}

/*
JXMLComponent.prototype.render = function() {
	if (!this.resolved)
		return;

	if (this.resolved.template)
		return this.root && this.root.render();
	else
		return this.resolved.render && this.resolved.render();
}
*/

JXMLComponent.prototype.create = function(module, attr, child_key) {
	attr = attr || {};

	var uid = this.uid + '.' + (child_key || module);

	// TODO: allow module overwrites
	var element = JXML.create(this.renderer, module, uid, attr);

	// TODO: distinguish between uid, key, id
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

/**
 * Communicate with components mainly by setting attributes.
 * Attributes set on document children must 
 *
 * Two types of components:
 * 1) Documents: cannot dirty, can modify attributes
 * 2) Render Elements: can dirty, no modify attributes, no children attributes
 *
 * 2 types of transforms:
 * Documents: can transform anything
 * Elements: transforms to renderlist
 */
JXMLComponent.prototype.setAttr = function(delta) {
	console.log('delta', this.module, JSON.stringify(delta, null, '\t'));
	delta = json(delta); // make a copy

	// Transform external children
	// TODO: handle slot/placement here
	var delta_children = delta.children;

	if (delta_children) {
		for (var k in delta_children) {
			delta_children['Z' + k] = delta_children[k];
			delete delta_children[k];
		}
	}

	if (delta.visible)
		this.resolve();

	if (this.resolved) {
		// Pass attributes / render if component resolved
		this.attr = this.attr || {}
		JXML.deepMerge(this.attr, delta);

		if (this.root) { // component has internal structure
console.log('setAttr, with root');
			// Allow component to mangle attributes
			if (this.resolved.onAttr)
				this.resolved.onAttr(delta, this.attr);

			// Pass mangled attributes to root / 'superclass'
			this.root.setAttr(delta);
		}
		else {
			console.log('setAttr: I am a rendering element', this.module);
			console.log('and my children are', delta.children);
			// Component is a rendering element
			var delta_children = delta.children;

			// Children are special and not passed to component
			delete delta.children;

			// Component is expected to return a renderlist/dirty
			var dirty = this.resolved.render(delta, this.attr);

			// Handle children from attributes delta
			// Send attributes to children. No return.
			var children = this.children = this.children || {},
				dirty_children = {};

			for (var k in delta_children) {
				var child = delta_children[k];

				if (!child) { // child is being removed
					if (children[k]) {
						// signal child for great destruction
						this.children[k].destroy();
						delete this.children[k];
						dirty_children[k] = null;
					}
				}
				else { // child is being added or modified
					if (children[k]) // modification
						children[k].setAttr(child);
					else {// creation
						children[k] = this.create(child.module, child, k);
						dirty_children[k] = true;
					}
				}
			}

			if (!isEmpty(dirty_children)) {
				dirty = dirty || {};
				dirty.children = dirty_children;
			}

			if (!isEmpty(dirty))
				this.onDirty(dirty);
		}
	}
	else {
		// component unresolved, save for later
		this.unresolved_attr = this.unresolved_attr || {};
		JXML.deepMerge(this.unresolved_attr, delta);
	}
	// By default, pass attributes to root
	/*
	if (this.resolved && this.resolved.onAttr) {
		var dirty = {};

		this.resolved.onAttr(dirty, delta, atttr);

		if (!isEmpty(dirty)) {
			deepMerge(this.dirty, dirty);

		}
	}
	else {
		if (this.attr.visible)
	this.visible = true;

	if (!this.resolved)
		this.resolve();
	else
		this.root.show();
			
		*/
}

JXMLComponent.prototype.onDirty = function(dirty) {
	var dirtylist = {};

	dirtylist[this.uid] = json(dirty);
	this.renderer.onDirty(dirtylist);
}

function json(obj) {
	return JSON.parse(JSON.stringify(obj || {}));
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
