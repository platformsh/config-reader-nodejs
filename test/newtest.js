const assert = require('assert').strict;
const psh = require('../src/platformsh.js');

let config = psh.config();

console.debug(psh);

let c = new psh.PlatformConfig();

describe("Config tests", () => {

    describe("isValidPlatform() tests", () => {

        it('Returns false when not on Platform.sh', () => {
            let c = new psh.PlatformConfig();

            assert.ok(!c.isValidPlatform());
        });

        it.skip('Returns true when on Platform.sh', () => {
            let c = new psh.PlatformConfig();

            assert.isTrue(c.isValidPlatform());
        });

    });

    describe("Build time tests", () => {

    });


    describe("Runtime tests", () => {

    });



});
