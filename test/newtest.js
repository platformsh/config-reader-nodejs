'use strict';

const assert = require('assert').strict;
const psh = require('../src/platformsh.js');
const fs = require('fs');

let encode = (value) => {
    return Buffer.from(JSON.stringify(value)).toString('base64');
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

        it('loads all routes in runtime', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let routes = c.routes();

            assert.ok(typeof routes == 'object');
            assert.equal(Object.keys(routes).length, 4);
        });

        it('throws when loading routes in build time', () => {
            let c = new psh.PlatformConfig(mockEnvironmentBuild);

            assert.throws(() => {
                let routes = c.routes();
            });
        });

        it('gets a route by id', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let route = c.getRoute('main');

            assert.equal(route['original_url'], 'https://www.{default}/');
        });

        it('throws on a non-existant route id', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.throws(() => {
                c.getRoute('missing');
            });
        });
    });

    describe("Relationship tests", () => {

        it('returns an existing relationship by name', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let creds = c.credentials('database');

            assert.equal(creds['scheme'], 'mysql');
            assert.equal(creds['type'], 'mysql:10.2');
        });

        it('throws an exception for a missing relationship name', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.throws(() => {
                let creds = c.getRoute('missing');
            });
        });

        it('throws an exception for a missing relationship index', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            assert.throws(() => {
                let creds = c.getRoute('database', 3);
            });
        });
    });

    describe("Variables tests", () => {

        it('returns an existing variable', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let value = c.variable('somevar');

            assert.equal(value, 'someval');
        });

        it('returns a default value when the variable doesn\'t exist', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let value = c.variable('missing', 'default-val');

            assert.equal(value, 'default-val');
        });

        it('returns all variables when on Platform', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let value = c.variables();

            assert.equal(value['somevar'], 'someval');
        });
    });

    describe("Application tests", () => {

        it('returns the application array on Platform.sh', () => {
            let c = new psh.PlatformConfig(mockEnvironmentRuntime);

            let app = c.application();

            assert.equal(app['type'], 'php:7.2');
        });
    });


    describe("Raw property tests", () => {


    });



});
