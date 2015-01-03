export default function CanvasRenderer(app, canvas) {
	this.app = app;
	this.canvas = canvas || document.body.appendChild(document.createElement('canvas'));
	this.ctx = this.canvas.getContext('2d');
}

CanvasRenderer.prototype.render = function() {
	var diff = this.app.render();

	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height );

	if (diff)
		var el = this.paintElement(diff);
}


CanvasRenderer.prototype.paintElement = function(attr) {
	var canvas = this.canvas, ctx = this.ctx;

	'width'  in attr || (attr.width  = 42);
	'height' in attr || (attr.height = 42);

	if (attr.background) {
		ctx.fillStyle = attr.background;
		ctx.fillRect(attr.x | 0, attr.y | 0, attr.width, attr.height);
	}

	if (attr.text) {
		ctx.fillStyle = '#000';
		ctx.textBaseline = 'top';
		ctx.fillText(attr.text, 0, 0);
	}

	var children = attr.children;

	if (attr.children) {
		for (var k in children) {
			var child_attr = children[k];

			if (child_attr)
				this.paintElement(child_attr);
		}
	}
}
