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
	for (var uid in dirtylist) {
		var attr = dirtylist[uid];

		if (attr)
			this.updateElement(uid, dirtylist[uid]);

		// TODO how to delete elements?
	}

	JXML.deepMerge(this.renderlist, dirtylist);

	if ( ! this.root_dom ) {
		var root = this.app;

		while (root.root)
			root = root.root;

		this.root_dom = this.elements[root.uid.replace(/:.*/, '')];

		if (this.root_dom)
			this.parent_dom.appendChild(this.root_dom);
	}
	console.log(this.renderlist);
}

HTMLRenderer.prototype.updateElement = function(uid, attr) {
	var el = this.getElement(uid), style = el.style;

	if (attr.x)
		style.left = attr.x + 'px';

	if (attr.y)
		style.top = attr.y + 'px';

	if (attr.width)
		style.width = attr.width + 'px';

	if (attr.height)
		style.height = attr.height + 'px';

	if (attr.background)
		style.background = attr.background;

	if (attr.cornerRadius)
		style.borderRadius = attr.cornerRadius + 'px';

	if (attr.borderColor)
		style.borderColor = attr.borderColor;

	if (attr.borderWidth) {
		style.borderWidth = attr.borderWidth + 'px';
		style.borderStyle = 'solid';
	}

	if (attr.text)
		el.textContent = attr.text;

	if (attr.textColor)
		style.color= attr.textColor;

	// TODO appendChild called more often than needed
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
	style.boxSizing = 'border-box';
	this.elements[uid] = el;

	return el;
}
