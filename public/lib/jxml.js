import JXMLCompiler from 'jx/build/JXMLCompiler';

var live_modules = {};

export function locate(load) {
	if (load.name in live_modules)
		load.metadata.source = live_modules[load.name];

	return load.name;
}

export function fetch(load) {
	if (load.metadata.source)
		return load.metadata.source;

	return System.fetch(load);
}

export function translate(load) {
	var jxml_compiler = new JXMLCompiler(load.name);

	if (load.name in live_modules) // Live editing support
		jxml_compiler.setSource(live_modules[load.name]);
	else
		jxml_compiler.setSource(load.source);

	var build_assets = jxml_compiler.build();

	return build_assets.jsString;
}

export function updateLive(name, source) {
	live_modules[name] = source;
}
