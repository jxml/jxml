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
}

HTMLRenderer.prototype.updateElement = function(uid, attr) {
	var el = this.getElement(uid), style = el.style;

	if ('x' in attr)
		style.left = attr.x + 'px';

	if ('y' in attr)
		style.top = attr.y + 'px';

	if ('width' in attr)
		style.width = attr.width + 'px';

	if ('height' in attr)
		style.height = attr.height + 'px';

	if ('background' in attr)
		style.background = attr.background;

	if ('cornerRadius' in attr)
		style.borderRadius = attr.cornerRadius + 'px';

	if ('borderColor' in attr)
		style.borderColor = attr.borderColor;

	if ('borderWidth' in attr) {
		style.borderWidth = attr.borderWidth + 'px';
		style.borderStyle = 'solid';
	}

	if ('text' in attr)
		el.textContent = attr.text;

	if ('textColor' in attr)
		style.color= attr.textColor;

	if ('fontFamily' in attr)
		style.fontFamily = attr.fontFamily;

	if ('fontSize' in attr)
		style.fontSize = attr.fontSize + 'px';

	if ('fontWeight' in attr)
		style.fontWeight = attr.fontWeight;

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
