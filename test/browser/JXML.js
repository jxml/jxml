describe('JXML', function() {
	var JXML;

	before(function(done) {
		System.import('jx/build/JXML')
			.then(function(module) {
				JXML = module;
				done();
			})
			.catch(done);
	});

	describe('#translate', function() {
		it('should have this method', function() {
			if (!JXML.translate) throw'failed';
		});
	});
});
