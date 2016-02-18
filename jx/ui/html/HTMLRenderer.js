import JXML from 'jx/JXML';

export default function HTMLRenderer(app, dom) {
	if (typeof app == 'string')
		app = JXML.create(this, app, dom && dom.id);

	this.app = app;
	dom = dom || document.body;
	this.parent_dom = dom;
	this.root_dom = null;
	this.elements = {};   // map of uid => dom elements
	this.renderlist = {};
	this.dirtylist = {};
}

// renderlist and dirtylist are flat maps of uuid => attrs
HTMLRenderer.prototype.onDirty = function(dirtylist) {
	JXML.diffMerge(this.dirtylist, dirtylist, true);

	if (!this.timer) this.timer = setTimeout(this.flush.bind(this), 10);
}

HTMLRenderer.prototype.flush = function() {
	var renderlist = this.renderlist,
		dirtylist = this.dirtylist,
		diff = JXML.mergeDiff(renderlist, dirtylist);

	this.timer = null;

	for (var uid in diff) {
		var delta = diff[uid];

		if (delta)
			this.updateElement(uid, diff[uid], renderlist[uid]);
		else
			this.deleteElement(uid); // TODO: element also deleted in updateElement()
	}

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

HTMLRenderer.prototype.deleteElement = function(uid) {
	var el = this.elements[uid];

	if (!el) return;

	el.parentNode && el.parentNode.removeChild(el);
	delete this.renderlist[uid];
	delete this.elements[uid];
}

HTMLRenderer.prototype.updateElement = function(uid, delta, attr) {
	var el = this.getElement(uid), style = el.style;

	if ('' in delta) { // TODO yuck?
		style.left = style.top = style.width = style.height =
		style.display = style.background = style.color = style.cursor =
		style.borderRadius = style.borderColor = style.borderWidth = style.borderStyle =
		style.whiteSpace = style.textAlign= style.lineHeight =
		style.fontFamily = style.fontSize = style.fontWeight =
		el.textContent = el.onclick = null;
	}

	if ('visible' in delta)
		style.display = delta.visible ? 'block' : 'none';

	if ('x' in delta)
		style.left = delta.x + 'px';

	if ('y' in delta)
		style.top = delta.y + 'px';

	if ('width' in delta)
		style.width = delta.width + 'px';

	if ('height' in delta) {
		style.height = delta.height + 'px';

		if ( ! ('textValign' in delta) )

		if (attr && 'textValign' in attr && ! ('textValign' in delta) ) {
			if (attr.textValign == 'center')
				style.lineHeight = delta.height + 'px';
			else
				style.lineHeight = null;
		}
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
		style.color = delta.textColor;

	if ('textAlign' in delta)
		style.textAlign = delta.textAlign;

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

	if ('cursor' in delta)
		style.cursor = delta.cursor;

	if ('overflow' in delta) {
		style.overflow = delta.overflow;
		style.willChange = delta.overflow == 'scroll'? 'transform' : '';
	}

	if ('onclick' in delta)
		el.onclick = function() {
			JXML.cast(delta.onclick[0], delta.onclick[1], delta.onclick[2]);
		};

	if ('onscroll' in delta)
		el.onscroll = function(e) {
			JXML.cast(delta.onscroll[0], delta.onscroll[1], [e.srcElement.scrollTop]);
		};

	// TODO appendChild called more often than needed
	for (var child_uid in delta.children) {
		var child_existence = delta.children[child_uid];

		if (delta.children[child_uid]) {
			var child_el = this.getElement(child_uid);

			el.appendChild(child_el);
		}
		else
			this.deleteElement(child_uid); // TODO: element also deleted in flush()
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
