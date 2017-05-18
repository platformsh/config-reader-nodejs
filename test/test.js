/* global after, before*/
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
var mockRequire = require('mock-require');

const mocks = require('./mocks');
const platformsh = require('../src/platformsh');

chai.use(require('chai-shallow-deep-equal'));

describe('Config function', () => {
  describe('Without environment variables', () => {
    it('Should fire an error', () => {
      assert.throws(platformsh.config, 'This is not running on platform.sh');
    });
  });

  describe('With all environment variables', () => {
    let backupProcessEnv = Object.assign({}, process.env);

    before(() => {
      process.env.PLATFORM_PROJECT = mocks.PLATFORM_PROJECT;
      process.env.PLATFORM_RELATIONSHIPS = mocks.PLATFORM_RELATIONSHIPS;
      process.env.PLATFORM_VARIABLES = mocks.PLATFORM_VARIABLES;
      process.env.PLATFORM_APP_DIR = mocks.PLATFORM_APP_DIR;
      process.env.PLATFORM_APPLICATION_NAME = mocks.PLATFORM_APPLICATION_NAME;
      process.env.PLATFORM_ENVIRONMENT = mocks.PLATFORM_ENVIRONMENT;
      process.env.PLATFORM_TREE_ID = mocks.PLATFORM_TREE_ID;
      process.env.PLATFORM_BRANCH = mocks.PLATFORM_BRANCH;
      process.env.PLATFORM_DOCUMENT_ROOT = mocks.PLATFORM_DOCUMENT_ROOT;
      process.env.OMP_NUM_THREADS = mocks.OMP_NUM_THREADS;
      process.env.PORT = mocks.PORT;
      process.env.PLATFORM_PROJECT_ENTROPY = mocks.PLATFORM_PROJECT_ENTROPY;
      process.env.PLATFORM_APPLICATION = mocks.PLATFORM_APPLICATION;
      process.env.PLATFORM_ROUTES = mocks.PLATFORM_ROUTES;
    });

    after(() => {
      process.env = backupProcessEnv;
    });

    it('Should get config', () => {
      assert.doesNotThrow(platformsh.config, 'This is not running on platform.sh');
      const config = platformsh.config();

      expect(config.project).to.shallowDeepEqual(mocks.PLATFORM_PROJECT);
      expect(config.relationships)
        .to.shallowDeepEqual(JSON.parse(new Buffer(mocks.PLATFORM_RELATIONSHIPS, 'base64').toString()));
      expect(config.variables)
        .to.shallowDeepEqual(JSON.parse(new Buffer(mocks.PLATFORM_VARIABLES, 'base64').toString()));
      expect(config.app_dir).to.shallowDeepEqual(mocks.PLATFORM_APP_DIR);
      expect(config.application_name).to.shallowDeepEqual(mocks.PLATFORM_APPLICATION_NAME);
      expect(config.environment).to.shallowDeepEqual(mocks.PLATFORM_ENVIRONMENT);
      expect(config.tree_id).to.shallowDeepEqual(mocks.PLATFORM_TREE_ID);
      expect(config.branch).to.shallowDeepEqual(mocks.PLATFORM_BRANCH);
      expect(config.document_root).to.equal(mocks.PLATFORM_DOCUMENT_ROOT);
      expect(config.omp_num_threads).to.shallowDeepEqual(mocks.OMP_NUM_THREADS);
      expect(config.port).to.equal(mocks.PORT);
      expect(config.project_entropy).to.equal(mocks.PLATFORM_PROJECT_ENTROPY);
      expect(config.application)
        .to.shallowDeepEqual(JSON.parse(new Buffer(mocks.PLATFORM_APPLICATION, 'base64').toString()));
      expect(config.routes).to.shallowDeepEqual(JSON.parse(new Buffer(mocks.PLATFORM_ROUTES, 'base64').toString()));
    });
  });

  describe('Without the OMP_NUM_THREADS variable  and file not available', () => {
    let backupProcessEnv = Object.assign({}, process.env);

    before(() => {
      process.env.PLATFORM_PROJECT = mocks.PLATFORM_PROJECT;
      process.env.PLATFORM_RELATIONSHIPS = mocks.PLATFORM_RELATIONSHIPS;
      process.env.PLATFORM_VARIABLES = mocks.PLATFORM_VARIABLES;
      process.env.PLATFORM_APP_DIR = mocks.PLATFORM_APP_DIR;
      process.env.PLATFORM_APPLICATION_NAME = mocks.PLATFORM_APPLICATION_NAME;
      process.env.PLATFORM_ENVIRONMENT = mocks.PLATFORM_ENVIRONMENT;
      process.env.PLATFORM_TREE_ID = mocks.PLATFORM_TREE_ID;
      process.env.PLATFORM_BRANCH = mocks.PLATFORM_BRANCH;
      process.env.PLATFORM_DOCUMENT_ROOT = mocks.PLATFORM_DOCUMENT_ROOT;
      process.env.PORT = mocks.PORT;
      process.env.PLATFORM_PROJECT_ENTROPY = mocks.PLATFORM_PROJECT_ENTROPY;
      process.env.PLATFORM_APPLICATION = mocks.PLATFORM_APPLICATION;
      process.env.PLATFORM_ROUTES = mocks.PLATFORM_ROUTES;
    });

    after(() => {
      process.env = backupProcessEnv;
    });

    it('Should throw error because the file not exist', () => {
      assert.throws(platformsh.config, 'Could not get number of cpus');
    });
  });

  describe('Without the OMP_NUM_THREADS variable and file available', () => {
    let backupProcessEnv = Object.assign({}, process.env);

    before(() => {
      process.env.PLATFORM_PROJECT = mocks.PLATFORM_PROJECT;
      process.env.PLATFORM_RELATIONSHIPS = mocks.PLATFORM_RELATIONSHIPS;
      process.env.PLATFORM_VARIABLES = mocks.PLATFORM_VARIABLES;
      process.env.PLATFORM_APP_DIR = mocks.PLATFORM_APP_DIR;
      process.env.PLATFORM_APPLICATION_NAME = mocks.PLATFORM_APPLICATION_NAME;
      process.env.PLATFORM_ENVIRONMENT = mocks.PLATFORM_ENVIRONMENT;
      process.env.PLATFORM_TREE_ID = mocks.PLATFORM_TREE_ID;
      process.env.PLATFORM_BRANCH = mocks.PLATFORM_BRANCH;
      process.env.PLATFORM_DOCUMENT_ROOT = mocks.PLATFORM_DOCUMENT_ROOT;
      process.env.PORT = mocks.PORT;
      process.env.PLATFORM_PROJECT_ENTROPY = mocks.PLATFORM_PROJECT_ENTROPY;
      process.env.PLATFORM_APPLICATION = mocks.PLATFORM_APPLICATION;
      process.env.PLATFORM_ROUTES = mocks.PLATFORM_ROUTES;

      mockRequire('/run/config.json', {
        info: {
          limits: {
            cpu: 1
          }
        }
      });
    });

    after(() => {
      process.env = backupProcessEnv;
      mockRequire.stop('/run/config.json');
    });

    it('Should throw error because the file not exist', () => {
      assert.doesNotThrow(platformsh.config, 'Could not get number of cpus');
      const config = platformsh.config();

      expect(config.omp_num_threads).to.equal(1);
    });
  });
});
