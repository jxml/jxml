export default function CanvasRenderer(app, canvas) {
	this.app = app;
	this.canvas = canvas || document.body.appendChild(document.createElement('canvas'));
	this.ctx = this.canvas.getContext('2d');

	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
}

CanvasRenderer.prototype.render = function() {
	var diff = this.app.render();

	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height );

	if (diff)
		var el = this.paintElement(diff);
}


CanvasRenderer.prototype.paintElement = function(attr, offsetx, offsety) {

	if (offsetx === undefined) offsetx = 0;
	if (offsety === undefined) offsety = 0;

	var canvas = this.canvas, ctx = this.ctx;

	'width'  in attr || (attr.width  = 42);
	'height' in attr || (attr.height = 42);

	if (attr.background) {
		ctx.fillStyle = attr.background;
		ctx.fillRect(attr.x | 0, attr.y | 0, attr.width, attr.height);
	}

	var left, top, cx, cy;
	left = +attr.attr.left || 0;
	top = +attr.attr.top || 0;
	cx = left + offsetx;
	cy = top + offsety;

	if (attr.text) {
		ctx.fillStyle = '#000';
		ctx.font = '16px Times'
		ctx.textBaseline = 'top';
		
		console.log(attr.text, cx, cy);
		ctx.fillText(attr.text, cx, cy);
	}

	var children = attr.children;

	if (attr.children) {
		for (var k in children) {
			var child_attr = children[k];

			if (child_attr) {
				this.paintElement(child_attr, cx, cy);
			}
		}
	}
}
