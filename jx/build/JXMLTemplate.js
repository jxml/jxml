var str = (function() {
	$CONSTRUCTOR
	$NAME.prototype = Object.create($SUPERCLASS, $PROTOTYPE);
}).toString()
  .replace(/^function[^{]*{|}$/g, '');

str += 'export default $NAME;'

export default str;
