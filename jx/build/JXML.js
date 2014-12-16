/**
 * Given a JXML source, return a JS represenation of the component
 */
export function translate(source) {
	var parser = new window.DOMParser(); // TODO: don't access globals like this

	var dom = parser.parseFromString(source, 'text/xml');

	return 'export default ' + JSON.stringify(XMLToJSON(dom.firstChild));
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
