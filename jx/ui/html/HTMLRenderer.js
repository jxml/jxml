import JXML from 'jx/JXML';

export default function HTMLRenderer(app, dom) {
	if (typeof app == 'string')
		app = JXML.create(this, app);

	this.app = app;
	dom = dom || document.body;
	this.parent_dom = dom;
	this.root_dom = null;
	this.elements = {};   // map of uid => dom elements
	this.renderlist = {};
}

HTMLRenderer.prototype.onDirty = function(dirtylist) {
console.log('diffff', JSON.stringify(dirtylist, null, '\t'));
	for (var uid in dirtylist)
		this.updateElement(uid, dirtylist[uid]);

	JXML.deepMerge(this.renderlist, dirtylist);
console.log('renderlist', JSON.stringify(this.renderlist, null, '\t'));

	if ( ! this.root_dom ) {
		var root = this.app;

		while (root.root)
			root = root.root;

		this.root_dom = this.elements[root.uid.replace(/:.*/, '')];
		console.log('root uid', root.uid);
		console.log(Object.keys(this.elements));

		if (this.root_dom) {
			console.log('root_dom found', this.root_dom)
			this.parent_dom.appendChild(this.root_dom);
		}
	}

	console.log('elements', this.elements);
}

HTMLRenderer.prototype.render = function() {

	var diff = this.app.render();

	console.log(diff);
	// TODO: this is not really the diff nor are we doing any patching
	this.root_dom.innerHTML = '';

	if (diff) {
		var el = this.createElement(diff);

		this.root_dom.appendChild(el);
	}
}

HTMLRenderer.prototype.updateElement = function(uid, attr) {
console.log('updating', uid, JSON.stringify(attr));
	// TODO attr == null
	var el = this.getElement(uid);

console.log(el)
	if (attr.background)
		el.style.background = attr.background;

	if (attr.text)
		el.textContent = attr.text;

	for (var child_uid in attr.children) {
		var child_el = this.getElement(child_uid);

		el.appendChild(child_el);
	}
}

HTMLRenderer.prototype.getElement = function(uid, tag) {
	if (uid in this.elements)
		return this.elements[uid];

	var el = document.createElement(tag || 'div'),
		style = el.style;

	el.id = 'jx:' + uid;
	style.position = 'absolute';
	this.elements[uid] = el;

	return el;
}
