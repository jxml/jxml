import JXMLTemplate from 'jx/build/JXMLTemplate'

/**
 * Given a JXML source, return a JS represenation of the component
 */
export function translate(source) {
	var parser = new window.DOMParser(); // TODO: don't access globals like this

	var dom = parser.parseFromString(source, 'text/xml');

	return 'export default ' + JSON.stringify(XMLToJSON(dom.firstChild));
}

export default JXML;

function JXML(name) {
	this.name = name;

	// Default pipeline
	this.pipeline = [];
}

JXML.prototype.setSource = function(source) {
	this.source = source;
}

JXML.prototype.build = function() {
	var build_assets = this.build_assets = {
		source: this.source,
		meta: {}
	};

	this.parseXML(build_assets);
	this.extractDocs(build_assets);
	this.extractScript(build_assets);
	this.generateJS(build_assets);

	return build_assets;
}

JXML.prototype.parseXML = function(build_assets) {
	var parser = new window.DOMParser(); // TODO: don't access globals like this

	var dom = parser.parseFromString(build_assets.source, 'text/xml');

	build_assets.template = XMLToJSON(dom.firstChild);
}

/**
 * Removes <Doc> from the template and puts in meta
 */
JXML.prototype.extractDocs = function(build_assets) {
	var template = build_assets.template, docs = [];

	template[2] = template[2].filter(function(child_node) {
		if (child_node[0] == 'Doc') {
			docs.push(child_node);

			return false;
		}

		return true;
	});

	build_assets.meta.docs = docs;
}

/**
 * Removes <script> from the template and puts in init
 */
JXML.prototype.extractScript = function(build_assets) {
	var template = build_assets.template, script = '';

	template[2] = template[2].filter(function(child_node) {
		if (child_node[0] == 'script') {
			script += child_node[2];

			return false;
		}

		return true;
	});

	build_assets.script = script;
}

JXML.prototype.generateJS = function(build_assets) {
	var jsString = makeClass(
		'anonymous',
		function() { throw "Use JXML.create" },
		null,
		{
			template: build_assets.template,
			init:     new Function(build_assets.script)
		}
	);

	build_assets.jsString = jsString;
}

/**
 * Converts an XML DOM to a JSON representation.
 *
 * > XMLToJSON('<Tag>moo</Tag>')
 * [ "Tag", {}, "moo" ]
 *
 * > XMLToJSON(
 * ... 'testing' +
 * ... '<First top="true">' +
 * ... 	<Second />' +
 * ... 	Moo' +
 * ... 	<Second>Cow</Second>' +
 * ... </First>'
 * ... )
 * [ 'First', { top: "true" }, [
 *   [ 'Second', {}, [] ],
 *   'Moo',
 *   [ 'Second', {}, [ 'Cow' ] ]
 * ] ]
 */
function XMLToJSON(element) {
	var name = element.namespaceURI? element.namespaceURI + '/' : '' + element.tagName,
		children = [],
		childNodes = element.childNodes;

	for (var i = 0; i < childNodes.length; i++) {
		var c = childNodes[i];

		switch (c.nodeType) {
			case 8: // Comment
				continue;

			case 3: // Text
				var text = c.nodeValue.replace(/[ \t\n]+/g, ' '); // compress whitespace

				children.push(text);

				continue;

			case 1: // Element
				children.push(XMLToJSON(c));

				continue;

			default:
				console.log('unknown node', c);
		}
	}

	// attributes is a hash map of 'Attribute Name' => 'Attribute Values'
	var attributes = {};

	var attrNodes = element.attributes;

	for (i = 0; i < attrNodes.length; i++) {
		var attr = attrNodes[i], value = attr.nodeValue;

		attributes[attr.nodeName] = value;
	}

	return [ element.tagName, attributes, children ];
}

/**
 * Makes a class given a constructor, the superclass and
 * the prototype.
 *
 * Returns JavaScript as a string
 */
function makeClass(name, constructor, superclass, prototype) {
	constructor = constructor.toString().replace(/^function[^{]*{|}$/g, '');
	prototype = toSource(prototype);

	function raw(str) { return function() { return str } }

	return JXMLTemplate
		.replace(/\$NAME/g, raw(name))
		.replace(/\$CONSTRUCTOR/g, raw(constructor))
		.replace(/\$SUPERCLASS/g, raw(superclass) || null)
		.replace(/\$PROTOTYPE/g, raw(prototype));
}

/**
 * Converts an object to a JavaScript string that would
 * recreate this object if eval'd
 */
function toSource(object) {
	var string = [];

	for (var k in object) {
		var item = '"' + k + '": ';

		if (typeof object[k] == 'function')
			item += object[k].toString();
		else
			item += JSON.stringify(object[k]);

		string.push(item);
	}

	string = string.join(',\n');

	return '{' + string + '}';
}
