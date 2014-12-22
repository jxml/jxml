export default function JXML() {}

var ComponentsMap = {};

var components = {}, // God object
	next_uid = 0;

/**
 * Always use JXML.create to instantiate JXML components.
 */
JXML.create = function(module, owner, attr) {
	var element = new JXMLComponent(module, owner, attr);

	element.uid = next_uid;
	components[next_uid++] = element;

	return element;
}

JXML.import = function(name, cb) {
	System.import(name + '.jxml!').then(cb);
}

function JXMLComponent(module, owner, attr) {
	this.module    = module;
	this.owner_uid = owner && owner.uid;
	this.attr      = attr;
	this.resolved  = false;
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
			var root = self.cloneTemplate(self.resolved.template);

			self.root = root;
			self.resolved.init && self.resolved.init();

			//self.children[0].setAttr(self.attr);
			//self.children[0].setAttr({ visible: true });
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

JXMLComponent.prototype.create = function(module, attr) {
	attr = attr || {};

	var id = attr.id;

	if (id) {
		if (this.IDs[id]) throw 'Duplicate ID';

		this.IDs[id] = element;
	}

	var element = JXML.create(module, this, attr);

	return element;
}

JXMLComponent.prototype.cloneTemplate = function(template) {
	var tag    = template[0],
		attr     = template[1],
		children = template[2];

	var element = this.create(tag, attr), child_elements = [];

	var text;

	for (var i = 0; i < children.length; i++) {
		var child = children[i], child_element;

		if (typeof child == 'string')
			text = (text || '') + child;
		else {
			child_element = this.cloneTemplate(child, element);
			child_elements.push(child_element);
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

function deepMerge(dst, src) {
	for (var k in src) {
		var v = src[k];

		if (v && typeof v == 'object' && k in dst)
			deepMerge(dst[k], v);
		else
			dst[k] = v;
	}
}

function template() {
	var $ID = JXML.create($NAME, function(c) { $ID = c });
}
