import JXML from 'jx/build/JXML';

export function translate(load) {
	var jxml = new JXML(load.name);

	jxml.setSource(load.source);

	var build_assets = jxml.build();

	return build_assets.jsString;
}
