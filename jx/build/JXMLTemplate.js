export default (function() {
	function $NAME() {
		$CONSTRUCTOR
	}

	$NAME.prototype = Object.create($SUPERCLASS, $PROTOTYPE);

	"export default $NAME;"
}).toString()
	.replace(/^function[^{]*{|}$/g, '')
	.replace(/^ *"(.*)";?$/mg, '$1')
