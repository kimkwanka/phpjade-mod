var assert = require('assert');
var jade = require('jade');
var phpjademod = require('../lib/phpjade.js');

phpjademod.init(jade);

describe('php filter', function () {
	it('can handle same line', function () {
        var html = jade.render(':php echo \'test filter!\';');
        assert.equal(html, '<?php echo \'test filter!\'; ?>');
    });

    it('can handle a single line', function () {
        var html = jade.render(':php\n\techo \'test filter!\';');
        assert.equal(html, '<?php echo \'test filter!\'; ?>');
    });

    it('can handle multiple lines', function () {
        var html = jade.render(':php\n\techo \'test filter!\';\n\techo \'test filter2!\';');
        assert.equal(html, '<?php echo \'test filter!\';\necho \'test filter2!\'; ?>');
    });

});
