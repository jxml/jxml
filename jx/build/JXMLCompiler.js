import JXMLTemplate from 'jx/build/JXMLTemplate'

export default JXMLCompiler;

function JXMLCompiler(name) {
	this.name = name.replace(/[^a-zA-Z_$]/g, '_');

	// Default pipeline
	this.pipeline = [];
}

JXMLCompiler.prototype.setSource = function(source) {
	this.source = source;
}

JXMLCompiler.prototype.build = function() {
	var build_assets = this.build_assets = {
		source: this.source,
		meta: {}
	};

	this.parseXML(build_assets);
	this.extractIDs(build_assets);
	this.extractDocs(build_assets);
	this.extractScript(build_assets);
	this.expandBraces(build_assets);
	this.generateJS(build_assets);

	return build_assets;
}

JXMLCompiler.prototype.parseXML = function(build_assets) {
	var parser = new window.DOMParser(); // TODO: don't access globals like this

	var dom = parser.parseFromString(build_assets.source, 'text/xml'), error

	if ( (error = dom.getElementsByTagName('parsererror')).length )
		throw error[0];

	build_assets.template = XMLToJSON(dom.documentElement);
}

/**
 * Identifies elements in template with IDs and builds a map
 * of IDs => path
 */
JXMLCompiler.prototype.extractIDs = function(build_assets) {
	var template = build_assets.template, IDs = {};

	extractIDs(template);

	function extractIDs(node, prefix) {
		var id = node.id;

		if (id) {
			if (id in IDs)
				throw 'Duplicate ID: ' + id;

			IDs[id] = prefix || '';
		}

		prefix = prefix? prefix + ' ' : '';

		for (var k in node.children)
			extractIDs(node.children[k], prefix + k);
	}

	build_assets.IDs = IDs;
}

/**
 * Removes <Doc> from the template and puts in meta
 */
JXMLCompiler.prototype.extractDocs = function(build_assets) {
	var template = build_assets.template,
		children = template.children,
		docs = [];

	for (var k in children) {
		var child = children[k];

		if (/(^|\/)Doc$/.test(child.module)) {
			child["component"] = this.name; // mark this documentation with source name
			docs.push(child);
			delete children[k];
		}
	}

	build_assets.meta.docs = docs;
}

/**
 * Removes <script> from the template and puts in init
 */
JXMLCompiler.prototype.extractScript = function(build_assets) {
	var
		template = build_assets.template,
		children = template.children,
		script = extractScript(template);

	if (script)
		// Rendering component, no document structure
		build_assets.template = null;
	else {
		for (var k in children) {
			var s = extractScript(children[k]);

			if (s) {
				script += s;
				delete children[k];
			}
		}
	}

	// TODO: provide a proper scope for <script>s
	var stub = (function() {
		var attr = this.jxmlcomponent.attr;

		if (typeof onAttr != "undefined")
		  this.onAttr = onAttr;
		if (typeof render != "undefined")
		  this.render = render;

		this.locals = {}; // map of local functions => reference

		if (this.jxmlcomponent.root)
			var setAttr = this.jxmlcomponent.root.setAttr.bind(this.jxmlcomponent.root);

		function LocalRef(id, path) {
			this.id = id;

			var node = this.path = {}, children_node, key;

			path = path.split(' ');

			while (path.length) {
				children_node = node.children = {};
				node = children_node[key = path.shift()] = {};
			}

			this.children_node = children_node;
			this.key = key;
		}

		LocalRef.prototype.setAttr = function(attr) {
			this.children_node[this.key] = attr;
			setAttr(this.path);
		}

	}).toString().replace(/^[^{]+{|}$/g, '');

	for (var id in build_assets.IDs)
		stub += 'var $id = new LocalRef("$id", "$path");\n'
			.replace(/\$id\b/g, id)
			.replace(/\$path\b/g, build_assets.IDs[id]);

	var FUNCTION_REGEX = /function +([$A-Z_][0-9A-Z_$]*)/gi;

	script.replace(FUNCTION_REGEX, function(_, name) {
		if (name) stub += 'this.locals.' + name + ' = ' + name + ';\n';
	});

	build_assets.script = stub + script;

	function extractScript(node) {
		var script = '';

		if (/(^|\/)script$/.test(node.module))
			return node.text;

		return script;
	}
}

JXMLCompiler.prototype.expandBraces = function(build_assets) {
	var delta = {}, expanded;

	visit(build_assets.template, function(path, node) {
		var d;

		for (var k in node) {
			if (k == 'children') continue;

			if (/^\s*\{\{.*\}\}\s*$/.test(node[k])) {
				expanded = true;

				if (!d) {
					d = delta;

					for (var i = 0; i < path.length; i++) {
						d = d.children = d.children || {};
						d = d[path[i]] = d[path[i]] || {};
					}
				}

				var code = node[k];

				d[k] = code;

				delete node[k];
			}
		}
	});

	if (!expanded) return;

	build_assets.braces = delta;

	// TODO Parse JS properly
	var code = JSON.stringify(delta).replace(/"\s*\{\{|\}\}\s*"/g, '');

	build_assets.script += ';\n' +
		'this.expandBraces = function(attr) { return ' + code + ' }';

	function visit(node, cb, path) {
		if (!node) return;

		path = path || [];
		cb(path, node);

		for (var k in node.children)
			visit(node.children[k], cb, path.concat(k));
	}
}

JXMLCompiler.prototype.generateJS = function(build_assets) {
	var jsString = makeClass(
		this.name,
		function(jxmlcomponent) { this.jxmlcomponent = jxmlcomponent },
		null,
		{
			template:    build_assets.template,
			init:        new Function(build_assets.script),
			IDs:         build_assets.IDs,
			docs:        build_assets.meta.docs,
			handle_cast: function(m, a) { this.locals[m] && this.locals[m].apply(this, a) }
		}
	);

	build_assets.jsString = jsString;
}

/**
 * Converts an XML DOM to a JSON representation.
 *
 * > XMLToJSON('<Tag>moo</Tag>')
 * { "module": "Tag", "text": "moo" }
 *
 * TODO: text interleaved with elements not handled well
 */
function XMLToJSON(element) {
	var name = (element.namespaceURI? element.namespaceURI + '/' : '') + element.localName,
		children = {},
		childNodes = element.childNodes,
		children_index = 1,
		text = '';

	for (var i = 0; i < childNodes.length; i++) {
		var c = childNodes[i];

		switch (c.nodeType) {
			case 8: // Comment
				continue;

			case 3: // Text
				text += c.nodeValue.replace(/[ \t\n]+/g, ' '); // compress whitespace

				continue;

			case 1: // Element
				children[toKey(children_index++)] = XMLToJSON(c);

				continue;

			case 4: // CData
				text += c.textContent; // treat as text

				continue;

			default:
				console.log('unknown node', c);
		}
	}

	// attributes is a hash map of 'Attribute Name' => 'Attribute Values'
	var attributes = { module: name };

	children && (attributes.children = children);
	text     && (attributes.text = text);

	var attrNodes = element.attributes;

	for (i = 0; i < attrNodes.length; i++) {
		var attr = attrNodes[i], value = attr.nodeValue;

		attributes[attr.nodeName] = autoConvert(value);
	}

	return attributes;
}

/**
 * Makes a class given a constructor, the superclass and
 * the prototype.
 *
 * Returns JavaScript as a string
 */
function makeClass(name, constructor, superclass, prototype) {
	constructor = constructor.toString().replace(/^function/, 'function ' + name);
	prototype = toObjectPrototypeProperties(prototype);

	function raw(str) { return function() { return str } }

	return JXMLTemplate
		.replace(/\$NAME/g, raw(name))
		.replace(/\$CONSTRUCTOR/g, raw(constructor))
		.replace(/\$SUPERCLASS/g, raw(superclass) || null)
		.replace(/\$PROTOTYPE/g, raw(prototype));
}

/**
 * Converts a prototype to a JavaScript string that would
 * recreate the prototype if passed to Object.create
 *
 * > toObjectPrototypeProperties({ moo: function() { return 42 }, cow: 42 })
 * "{\"moo\": { value: function() { return 42 } },\n\"cow\": { value: 42 }}"
 */
function toObjectPrototypeProperties(object) {
	var string = [];

	for (var k in object) {
		var item = '"' + k + '": { value: ';

		if (typeof object[k] == 'function')
			item += object[k].toString();
		else
			item += JSON.stringify(object[k]);

		item += ' }';

		string.push(item);
	}

	string = string.join(',\n');

	return '{' + string + '}';
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
 * If a string looks like a JS type, convert it
 *
 * > autoConvert("42");
 * 42
 *
 * > autoConvert("moocow");
 * "moocow"
 *
 * > autoConvert("true");
 * true
 */
function autoConvert(str) {
	try { return JSON.parse(str) }
	catch(e) { return str }
}
