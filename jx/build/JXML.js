import JXMLTemplate from 'jx/build/JXMLTemplate'

export default JXML;

function JXML(name) {
	this.name = name.replace(/[^a-zA-Z_$]/g, '_');

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

	var dom = parser.parseFromString(build_assets.source, 'text/xml'), error

	if ( (error = dom.getElementsByTagName('parsererror')).length )
		throw error[0];

	build_assets.template = XMLToJSON(dom.documentElement);
}

/**
 * Removes <Doc> from the template and puts in meta
 */
JXML.prototype.extractDocs = function(build_assets) {
	var template = build_assets.template, docs = [];

	template[2] = template[2].filter(function(child_node) {
		if (/(^|\/)Doc$/.test(child_node[0])) {
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

	template[2] = template[2].filter(extractScript);

	if (!extractScript(template))
		build_assets.template = null;

	// TODO: provide a proper scope for <script>s
	script = 'var attr = this.jxmlcomponent.attr' + script;

	build_assets.script = script;

	function extractScript(child_node) {
		if (/(^|\/)script$/.test(child_node[0])) {
			var s = child_node[2];

			if (Array.isArray(s))
				s = s.join('');

			script += s;

			return false;
		}

		return true;
	}
}

JXML.prototype.generateJS = function(build_assets) {
	var jsString = makeClass(
		this.name,
		function(jxmlcomponent) { this.jxmlcomponent = jxmlcomponent },
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
	var name = (element.namespaceURI? element.namespaceURI + '/' : '') + element.tagName,
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

			case 4: // CData
				children.push(c.textContent) // treat as text

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

	return [ name, attributes, children ];
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
 * Converts an prototype to a JavaScript string that would
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
