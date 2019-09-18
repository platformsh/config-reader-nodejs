'use strict';

const assert = require('assert').strict;
const psh = require('../src/platformsh.js');
const fs = require('fs');

function encode(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64');
}

function loadJsonFile(name) {
    return JSON.parse(fs.readFileSync(`test/testdata/${name}.json`, 'utf8'));
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

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
            let c = new psh.Config();

            assert.ok(!c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, build time', () => {
            let c = new psh.Config(mockEnvironmentBuild);

            assert.ok(c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, runtime', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.isValidPlatform());
        });
    });

    describe("inBuid() tests", () => {

        it('Returns true in build environment', () => {
            let c = new psh.Config(mockEnvironmentBuild);

            assert.ok(c.inBuild())
        });

        it('Returns false in runtime environment', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.inBuild())
        });
    });


    describe("inRuntime() tests", () => {

        it('Returns true in runtime environment', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.inRuntime());
        });

        it('Returns false in build environment', () => {
            let c = new psh.Config(mockEnvironmentBuild);

            assert.ok(!c.inRuntime());
        });
    });

    describe("onEnterprise() tests", () => {

        it('Returns true in enterprise environment', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';

            let c = new psh.Config(mockEnvironmentEnterprise);

            assert.ok(c.onEnterprise());
        });

        it('Returns false in standard environment', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.onEnterprise());
        });
    });

    describe("onProduction() tests", () => {

        it('Returns true on enterprise production', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';
            mockEnvironmentEnterprise['PLATFORM_BRANCH'] = 'production';

            let c = new psh.Config(mockEnvironmentEnterprise);

            assert.ok(c.onProduction());
        });

        it('Returns false on enterprise staging', () => {
            let mockEnvironmentEnterprise = deepClone(mockEnvironmentRuntime);
            mockEnvironmentEnterprise['PLATFORM_MODE'] = 'enterprise';

            let c = new psh.Config(mockEnvironmentEnterprise);

            assert.ok(!c.onProduction());
        });

        it('Returns true on standard master', () => {
            let mockEnvironmentProduction = deepClone(mockEnvironmentRuntime);
            mockEnvironmentProduction['PLATFORM_BRANCH'] = 'master';

            let c = new psh.Config(mockEnvironmentProduction);

            assert.ok(c.onProduction());
        });

        it('Returns false on standard dev', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.onProduction());
        });
    });

    describe("Route tests", () => {

        it('loads all routes in runtime', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let routes = c.routes();

            assert.ok(typeof routes == 'object');
            assert.equal(Object.keys(routes).length, 6);
        });

        it('throws when loading routes in build time', () => {
            let c = new psh.Config(mockEnvironmentBuild);

            assert.throws(() => {
                let routes = c.routes();
            });
        });

        it('gets the primary route', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let route = c.getPrimaryRoute();

            assert.equal(route['original_url'], 'https://www.{default}/');
        });

        it('gets a route by id', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let route = c.getRoute('main');

            assert.equal(route['original_url'], 'https://www.{default}/');
        });

        it('throws on a non-existant route id', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                c.getRoute('missing');
            });
        });


        it('loads all routes in local', () => {
            let env = deepClone(mockEnvironmentRuntime);
            delete env['PLATFORM_APPLICATION_NAME'];
            delete env['PLATFORM_ENVIRONMENT'];
            delete env['PLATFORM_BRANCH'];
             let c = new psh.Config(env);

            let routes = c.routes();

            assert.ok(typeof routes == 'object');
            assert.equal(Object.keys(routes).length, 6);
        });
    });

    describe("Relationship tests", () => {

        it('returns an existing relationship by name', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let creds = c.credentials('database');

            assert.equal(creds['scheme'], 'mysql');
            assert.equal(creds['type'], 'mysql:10.2');
        });

        it('throws an exception for a missing relationship name', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                let creds = c.getRoute('missing');
            });
        });

        it('throws an exception for a missing relationship index', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                let creds = c.getRoute('database', 3);
            });
        });
    });

    describe('hasRelationship tests', () => {

        if('returns true for an existing relationship', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.hasRelationship('database'));
        });

        if('returns false for an missing relationship', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.hasRelationship('missing'));
        });
    });

    describe("Variables tests", () => {

        it('returns an existing variable', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let value = c.variable('somevar');

            assert.equal(value, 'someval');
        });

        it('returns a default value when the variable doesn\'t exist', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let value = c.variable('missing', 'default-val');

            assert.equal(value, 'default-val');
        });

        it('returns all variables when on Platform', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let value = c.variables();

            assert.equal(value['somevar'], 'someval');
        });
    });

    describe("Application tests", () => {

        it('returns the application array on Platform.sh', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let app = c.application();

            assert.equal(app['type'], 'php:7.2');
        });
    });


    describe("Raw property tests", () => {

        it('returns the correct value for raw properties', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.equal(c.appDir, '/app');
            assert.equal(c.applicationName, 'app');
            assert.equal(c.project, 'test-project');
            assert.equal(c.treeId, 'abc123');
            assert.equal(c.projectEntropy, 'def789');

            assert.equal(c.branch, 'feature-x');
            assert.equal(c.environment, 'feature-x-hgi456');
            assert.equal(c.documentRoot, '/app/web');
            assert.equal(c.smtpHost, '1.2.3.4');
            assert.equal(c.port, '8080');
            assert.equal(c.socket, 'unix://tmp/blah.sock');
        });

        it('throws when a runtime property is accessed at build time', () => {
            let c = new psh.Config(mockEnvironmentBuild);

            assert.throws(() => {
                let branch = c.branch;
            });
        });
    });

    describe('Credential formatter tests', () => {

        it('throws when a formatter is not found', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                c.formattedCredentials('database', 'not-existing');
            });
        });

        it('calls a registered formatter', () => {
            let c = new psh.Config(mockEnvironmentRuntime);
            let called = false;

            c.registerFormatter('test', (credentials) => {
                called = true;
                return 'stuff';
            });

            let formatted = c.formattedCredentials('database', 'test');

            assert.ok(called);
            assert.equal(formatted, 'stuff');
        });

        it('formats a solr-node connection', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let formatted = c.formattedCredentials('solr', 'solr-node');

            assert.deepEqual(formatted, {
                host: 'solr.internal',
                port: 8080,
                protocol: 'http',
                core: 'collection1'
            });
        });

        it('formatts a puppeteer connection', () => {
            let c = new psh.Config(mockEnvironmentRuntime);

            let formatted = c.formattedCredentials('headless', 'puppeteer')

            assert.equal(formatted, 'http://169.254.16.215:9222')
        });
     });

});
