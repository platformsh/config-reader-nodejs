'use strict';

const assert = require('assert').strict;
const psh = require('../src/platformsh.js');
const fs = require('fs');

let encode = (value) => {
    return Buffer.from(JSON.stringify(value)).toString('base64');
};

let decode = (value) => {
    JSON.stringify(atob(value));
};

let loadJsonFile = (name) => {
    return JSON.parse(fs.readFileSync(`test/testdata/${name}.json`, 'utf8'));
};

let deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

describe("Config tests", () => {

    let mockEnvironmentBuild = [];
    let mockEnvironmentRuntime = [];

    console.debug(process.cwd());

    before(() => {
        let env = loadJsonFile('ENV');

        ['PLATFORM_APPLICATION', 'PLATFORM_VARIABLES'].forEach((item) => {
            env[item] = encode(loadJsonFile(item));
        });

        mockEnvironmentBuild = deepClone(env);

        ['PLATFORM_ROUTES', 'PLATFORM_RELATIONSHIPS'].forEach((item) => {
            env[item] = encode(loadJsonFile(item));
        });

        let envRuntime = loadJsonFile('ENV_runtime');
        env = {...env, ...envRuntime};

        mockEnvironmentRuntime = env;
    });

    describe("isValidPlatform() tests", () => {

        it('Returns false when not on Platform.sh', () => {
            let c = new psh.PlatformConfig();

            assert.ok(!c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, build time', () => {
            let c = new psh.PlatformConfig(mockEnvironmentBuild);

            assert.ok(c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, runtime', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.ok(c.isValidPlatform());
        });
    });

    describe("inBuid() tests", () => {

        it('Returns true in build environment', () => {
            let c = new psh.PlatformConfig(mockEnvironmentBuild);

            assert.ok(c.inBuild())
        });

        it('Returns false in runtime environment', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.ok(!c.inBuild())
        });
    });


    describe("inRuntime() tests", () => {

        it('Returns true in runtime environment', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.ok(c.inRuntime());
        });

        it('Returns false in build environment', () => {
            let c = new psh.PlatformConfig(mockEnvironmentBuild);

            assert.ok(!c.inRuntime());
        });
    });

    describe("onEnterprise() tests", () => {

        it('Returns true in enterprise environment', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';

            let c = new psh.PlatformConfig(mockEnvironmentEnterprise);

            assert.ok(c.onEnterprise());
        });

        it('Returns false in standard environment', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.ok(!c.onEnterprise());
        });
    });

    describe("onProduction() tests", () => {

        it('Returns true on enterprise production', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';
            mockEnvironmentEnterprise['PLATFORM_BRANCH'] = 'production';

            let c = new psh.PlatformConfig(mockEnvironmentEnterprise);

            assert.ok(c.onProduction());
        });

        it('Returns false on enterprise staging', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';

            let c = new psh.PlatformConfig(mockEnvironmentEnterprise);

            assert.ok(!c.onProduction());
        });

        it('Returns true on standard master', () => {
            let mockEnvironmentProduction = deepClone(mockEnvironmentRuntime);
            mockEnvironmentProduction['PLATFORM_BRANCH'] = 'master';

            let c = new psh.PlatformConfig(mockEnvironmentProduction);

            assert.ok(c.onProduction());
        });

        it('Returns false on standard dev', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.ok(!c.onProduction());
        });
    });

    describe("Route tests", () => {


    });

    describe("Relationship tests", () => {

    });

    describe("Variables tests", () => {


    });

    describe("Raw property tests", () => {


    });



});
