import JXML from 'jx/JXML';

export default function CanvasRenderer(app, canvas) {
	if (typeof app == 'string')
		app = JXML.create(this, app);

	this.app = app;
	this.canvas = canvas || document.body.appendChild(document.createElement('canvas'));
	this.ctx = this.canvas.getContext('2d');
	this.renderlist = {};
}

CanvasRenderer.prototype.onDirty = function(dirtylist) {
	JXML.deepMerge(this.renderlist, dirtylist);

	if ( ! this.root_uid ) {
		var root = this.app;

		while (root.root)
			root = root.root;

		this.root_uid = root.uid.replace(/:.*/, '');
	}

	if (this.root_uid) {
		var render_root = this.renderlist[this.root_uid];

		this.canvas.width = render_root.width;
		this.canvas.height = render_root.height;

		this.render(this.root_uid);
	}
}

CanvasRenderer.prototype.render = function(root_uid) {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height );
	this.paintElement(root_uid);
}


CanvasRenderer.prototype.paintElement = function(uid) {
	var canvas = this.canvas,
		ctx = this.ctx,
		attr = this.renderlist[uid];

	if (!attr) return;

	ctx.save();
	ctx.translate(attr.x | 0, attr.y | 0);

	'width'  in attr || (attr.width  = 42);
	'height' in attr || (attr.height = 42);

	if (attr.background) {
		ctx.fillStyle = attr.background;
		ctx.fillRect(0, 0, attr.width, attr.height);
	}

	if (attr.borderWidth) {
		var lineWidth = attr.borderWidth

		ctx.strokeStyle = attr.borderColor || '#000';
		ctx.lineWidth = lineWidth;
		ctx.strokeRect(lineWidth * 0.5, lineWidth * 0.5, attr.width - lineWidth, attr.height - lineWidth);
		ctx.translate(lineWidth, lineWidth);
	}

	if (attr.text) {
		ctx.fillStyle = attr.textColor || '#000';
		ctx.font = (attr.fontSize || 12) + 'px ' + (attr.fontFamily || 'sans-serif');
		ctx.textBaseline = 'top';
		ctx.fillText(attr.text, 0, 0);
	}

	var children = attr.children;

	if (attr.children) {
		for (var k in children)
			this.paintElement(k);
	}

	ctx.restore();
}
