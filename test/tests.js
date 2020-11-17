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
        const env = loadJsonFile('ENV');

        ['PLATFORM_APPLICATION', 'PLATFORM_VARIABLES'].forEach((item) => {
            env[item] = encode(loadJsonFile(item));
        });

        mockEnvironmentBuild = deepClone(env);

        ['PLATFORM_ROUTES', 'PLATFORM_RELATIONSHIPS'].forEach((item) => {
            env[item] = encode(loadJsonFile(item));
        });

        const envRuntime = loadJsonFile('ENV_runtime');

        mockEnvironmentRuntime = {...env, ...envRuntime};
    });

    describe("isValidPlatform() tests", () => {

        it('Returns false when not on Platform.sh', () => {
            const c = new psh.Config();

            assert.ok(!c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, build time', () => {
            const c = new psh.Config(mockEnvironmentBuild);

            assert.ok(c.isValidPlatform());
        });

        it('Returns true when on Platform.sh, runtime', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.isValidPlatform());
        });
    });

    describe("inBuid() tests", () => {

        it('Returns true in build environment', () => {
            const c = new psh.Config(mockEnvironmentBuild);

            assert.ok(c.inBuild())
        });

        it('Returns false in runtime environment', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.inBuild())
        });
    });


    describe("inRuntime() tests", () => {

        it('Returns true in runtime environment', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.inRuntime());
        });

        it('Returns false in build environment', () => {
            const c = new psh.Config(mockEnvironmentBuild);

            assert.ok(!c.inRuntime());
        });
    });

    describe("onDedicated() tests", () => {

        it('Returns true in Dedicated environment', () => {
            const mockEnvironmentDedicated = deepClone(mockEnvironmentRuntime);
            mockEnvironmentDedicated['PLATFORM_MODE'] = 'enterprise';

            const c = new psh.Config(mockEnvironmentDedicated);

            assert.ok(c.onDedicated());
        });

        it('Returns false in standard environment', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.onDedicated());
        });
    });

    describe("onProduction() tests", () => {

        it('Returns true on Dedicated production', () => {
            const mockEnvironmentDedicated = deepClone(mockEnvironmentRuntime);
            mockEnvironmentDedicated['PLATFORM_MODE'] = 'enterprise';
            mockEnvironmentDedicated['PLATFORM_BRANCH'] = 'production';

            const c = new psh.Config(mockEnvironmentDedicated);

            assert.ok(c.onProduction());
        });

        it('Returns false on Dedicated staging', () => {
            const mockEnvironmentDedicated = deepClone(mockEnvironmentRuntime);
            mockEnvironmentDedicated['PLATFORM_MODE'] = 'enterprise';

            const c = new psh.Config(mockEnvironmentDedicated);

            assert.ok(!c.onProduction());
        });

        it('Returns true on standard master', () => {
            const mockEnvironmentProduction = deepClone(mockEnvironmentRuntime);
            mockEnvironmentProduction['PLATFORM_BRANCH'] = 'master';

            const c = new psh.Config(mockEnvironmentProduction);

            assert.ok(c.onProduction());
        });

        it('Returns false on standard dev', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(!c.onProduction());
        });
    });

    describe("Route tests", () => {

        it('loads all routes in runtime', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const routes = c.routes();

            assert.ok(typeof routes == 'object');
            assert.equal(Object.keys(routes).length, 6);
        });

        it('throws when loading routes in build time', () => {
            const c = new psh.Config(mockEnvironmentBuild);

            assert.throws(() => {
                const routes = c.routes();
            });
        });

        it('gets the primary route', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const route = c.getPrimaryRoute();

            assert.equal(route['original_url'], 'https://www.{default}/');
            assert.equal(route['primary'], true);
        });

        it('returns all upstream routes', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const routes = c.getUpstreamRoutes();

            assert.equal(3, Object.keys(routes).length);
            assert.equal(routes['https://www.master-7rqtwti-gcpjkefjk4wc2.us-2.platformsh.site/']['original_url'], 'https://www.{default}/');
        });

        it('returns all upstream routes for a specific app', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const routes = c.getUpstreamRoutes('app');

            assert.equal(2, Object.keys(routes).length);
            assert.equal(routes['https://www.master-7rqtwti-gcpjkefjk4wc2.us-2.platformsh.site/']['original_url'], 'https://www.{default}/');
        });

        it('returns all upstream routes for a specific app on dedicated', () => {
            const env = mockEnvironmentRuntime;
            // Simulate a Dedicated-style upstream name.
            const routeData = loadJsonFile('PLATFORM_ROUTES');
            routeData['https://www.master-7rqtwti-gcpjkefjk4wc2.us-2.platformsh.site/']['upstream'] = 'app:http';
            env['PLATFORM_ROUTES'] = encode(routeData);

            const c = new psh.Config(env);

            const routes = c.getUpstreamRoutes('app');

            assert.equal(2, Object.keys(routes).length);
            assert.equal(routes['https://www.master-7rqtwti-gcpjkefjk4wc2.us-2.platformsh.site/']['original_url'], 'https://www.{default}/');
        });

        it('gets a route by id', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const route = c.getRoute('main');

            assert.equal(route['original_url'], 'https://www.{default}/');
        });

        it('throws on a non-existant route id', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                c.getRoute('missing');
            });
        });


        it('loads all routes in local', () => {
            const env = deepClone(mockEnvironmentRuntime);
            delete env['PLATFORM_APPLICATION_NAME'];
            delete env['PLATFORM_ENVIRONMENT'];
            delete env['PLATFORM_BRANCH'];
             const c = new psh.Config(env);

            const routes = c.routes();

            assert.ok(typeof routes == 'object');
            assert.equal(Object.keys(routes).length, 6);
        });
    });

    describe("Relationship tests", () => {

        it('returns an existing relationship by name', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const creds = c.credentials('database');

            assert.equal(creds['scheme'], 'mysql');
            assert.equal(creds['type'], 'mysql:10.2');
        });

        it('throws an exception for a missing relationship name', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                const creds = c.getRoute('missing');
            });
        });

        it('throws an exception for a missing relationship index', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                const creds = c.getRoute('database', 3);
            });
        });
    });

    describe('hasRelationship tests', () => {

        if('returns true for an existing relationship', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.hasRelationship('database'));
        });

        if('returns false for an missing relationship', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.ok(c.hasRelationship('missing'));
        });
    });

    describe("Variables tests", () => {

        it('returns an existing variable', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const value = c.variable('somevar');

            assert.equal(value, 'someval');
        });

        it('returns a default value when the variable doesn\'t exist', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const value = c.variable('missing', 'default-val');

            assert.equal(value, 'default-val');
        });

        it('returns all variables when on Platform', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const value = c.variables();

            assert.equal(value['somevar'], 'someval');
        });
    });

    describe("Application tests", () => {

        it('returns the application array on Platform.sh', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const app = c.application();

            assert.equal(app['type'], 'php:7.2');
        });
    });


    describe("Raw property tests", () => {

        it('returns the correct value for raw properties', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

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
            const c = new psh.Config(mockEnvironmentBuild);

            assert.throws(() => {
                const branch = c.branch;
            });
        });
    });

    describe('Credential formatter tests', () => {

        it('throws when a formatter is not found', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            assert.throws(() => {
                c.formattedCredentials('database', 'not-existing');
            });
        });

        it('calls a registered formatter', () => {
            const c = new psh.Config(mockEnvironmentRuntime);
            let called = false;

            c.registerFormatter('test', (credentials) => {
                called = true;
                return 'stuff';
            });

            const formatted = c.formattedCredentials('database', 'test');

            assert.ok(called);
            assert.equal(formatted, 'stuff');
        });

        it('formats a solr-node connection', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const formatted = c.formattedCredentials('solr', 'solr-node');

            assert.deepEqual(formatted, {
                host: 'solr.internal',
                port: 8080,
                protocol: 'http',
                core: 'collection1'
            });
        });

        it('formatts a puppeteer connection', () => {
            const c = new psh.Config(mockEnvironmentRuntime);

            const formatted = c.formattedCredentials('headless', 'puppeteer')

            assert.equal(formatted, 'http://169.254.16.215:9222')
        });
     });

});
