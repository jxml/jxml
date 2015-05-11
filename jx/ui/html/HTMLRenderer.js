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
	this.dirtylist = {};
}

HTMLRenderer.prototype.onDirty = function(dirtylist) {
	JXML.deepMerge(this.dirtylist, dirtylist);

	if (!this.timer) this.timer = setTimeout(this.flush.bind(this), 10);
}

HTMLRenderer.prototype.flush = function() {
	var renderlist = this.renderlist;

	this.timer = null;

	var dirtylist = this.dirtylist;

	for (var uid in dirtylist) {
		var attr = dirtylist[uid];

		if (attr)
			this.updateElement(uid, dirtylist[uid], renderlist[uid]);

		// TODO how to delete elements?
	}

	JXML.deepMerge(renderlist, dirtylist);

	this.dirtylist = {};

	if ( ! this.root_dom ) {
		var root = this.app;

		while (root.root)
			root = root.root;

		this.root_dom = this.elements[root.uid.replace(/:.*/, '')];

		if (this.root_dom)
			this.parent_dom.appendChild(this.root_dom);
	}
}

HTMLRenderer.prototype.updateElement = function(uid, delta, attr) {
	var el = this.getElement(uid), style = el.style;

	if ('x' in delta)
		style.left = delta.x + 'px';

	if ('y' in delta)
		style.top = delta.y + 'px';

	if ('width' in delta)
		style.width = delta.width + 'px';

	if ('height' in delta) {
		style.height = delta.height + 'px';

		if (attr && 'textValign' in attr && ! ('textValign' in delta) )
			style.lineHeight = delta.height + 'px';
	}

	if ('background' in delta)
		style.background = delta.background;

	if ('cornerRadius' in delta)
		style.borderRadius = delta.cornerRadius + 'px';

	if ('borderColor' in delta)
		style.borderColor = delta.borderColor;

	if ('borderWidth' in delta) {
		style.borderWidth = delta.borderWidth + 'px';
		style.borderStyle = 'solid';
	}

	if ('text' in delta) {
		style.whiteSpace = 'nowrap';
		el.textContent = delta.text;
	}

	if ('textColor' in delta)
		style.color= delta.textColor;

	if ('textAlign' in delta)
		style.textAlign= delta.textAlign;

	if ('lineHeight' in delta) {
		style.lineHeight = delta.lineHeight;
	}

	if ('textValign' in delta) {
		if (delta.textValign == 'center')
			style.lineHeight = 'height' in delta? delta.height + 'px' : attr.height + 'px' || '';
	}

	if ('fontFamily' in delta)
		style.fontFamily = delta.fontFamily;

	if ('fontSize' in delta)
		style.fontSize = delta.fontSize + 'px';

	if ('fontWeight' in delta)
		style.fontWeight = delta.fontWeight;

	if ('onclick' in delta)
		el.onclick = function() {
			JXML.cast(delta.onclick[0], delta.onclick[1], delta.onclick[2]);
		};

	// TODO appendChild called more often than needed
	for (var child_uid in delta.children) {
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
