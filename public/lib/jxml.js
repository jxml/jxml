import JXMLCompiler from 'jx/build/JXMLCompiler';

export function translate(load) {
	var jxml_compiler = new JXMLCompiler(load.name);

	jxml_compiler.setSource(load.source);

	var build_assets = jxml_compiler.build();

	return build_assets.jsString;
}
