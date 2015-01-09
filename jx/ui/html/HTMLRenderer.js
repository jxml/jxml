export default function HTMLRenderer(app, dom) {
	this.app = app;
	dom = dom || document.body;
	this.root_dom = dom;
}

HTMLRenderer.prototype.render = function() {
	var diff = this.app.render();

	// TODO: this is not really the diff nor are we doing any patching
	this.root_dom.innerHTML = '';

	if (diff) {
		var el = this.createElement(diff);

		this.root_dom.appendChild(el);
	}
}


HTMLRenderer.prototype.createElement = function(attr) {
	var el = document.createElement(attr.tag || 'div');

	if (attr.uid)
		el.id = 'jx:' + attr.uid;

	el.style.position = 'absolute';

	if (attr.text)
		el.textContent = attr.text;

	var children = attr.children;

	if (children) {
		for (var k in children) {
			var child_attr = children[k];

			if (!child_attr) continue;

			var child_el = this.createElement(child_attr);

			el.appendChild(child_el);
		}
	}

	return el;
}
