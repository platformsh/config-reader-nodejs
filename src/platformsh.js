'use strict';

let decode = (value) => {
    return JSON.parse(Buffer.from(value, 'base64'));
};

class PlatformConfig {

    // environment = [];

    // envPrefix = '';

    constructor(env = null, prefix = 'PLATFORM_') {
        this.environmentVariables = env || process.env;
        this.envPrefix = prefix;

        // Node doesn't support pre-defined object properties in classes, so
        // this is mostly for documentation but also to ensure there's always
        // a legal defined value.
        this.routesDef = [];
        this.relationshipsDef = [];
        this.variablesDef = [];
        this.applicationDef = [];

        if (this.isValidPlatform()) {
            if (this.inRuntime()) {
                let routes = this._getValue('ROUTES');
                if (routes) {
                    this.routesDef = decode(routes);
                    for (let [url, route] of Object.entries(this.routesDef)) {
                        route['url'] = url;
                    }
                }

                let relationships = this._getValue('RELATIONSHIPS');
                if (relationships) {
                    this.relationshipsDef = decode(relationships);
                }
            }

            let variables = this._getValue('VARIABLES');
            if (variables) {
                this.variablesDef = decode(variables);
            }

            let application = this._getValue('APPLICATION');
            if (application) {
                this.applicationDef = decode(application);
            }
        }


    }

    isValidPlatform() {
        return Boolean(this._getValue('APPLICATION_NAME'));
    }

    inBuild() {
        return this.isValidPlatform() && !Boolean(this._getValue('ENVIRONMENT'));
    }

    inRuntime() {
        return this.isValidPlatform() && Boolean(this._getValue('ENVIRONMENT'));
    }

    onEnterprise() {
        return this.isValidPlatform() && this._getValue('MODE') == 'enterprise';
    }

    onProduction() {
        if (!this.inRuntime()) {
            return;
        }

        let prodBranch = this.onEnterprise() ? 'production' : 'master';

        return this._getValue('BRANCH') == prodBranch;
    }

    routes() {
        if (!this.isValidPlatform()) {
            throw new Error('You are not running on Platform.sh, so routes are not available.');
        }

        if (this.inBuild()) {
            throw new Error('Routes are not available during the build phase.');
        }

        return this.routesDef;
    }

    getRoute(id) {
        for (let [url, route] of Object.entries(this.routes())) {
            if (route.id == id) {
                return route;
            }
        }

        throw new Error(`No such route id found: ${id}`);
    }

    credentials(relationship, index = 0) {
        if (!this.isValidPlatform()) {
            throw new Error('You are not running on Platform.sh, so relationships are not available.');
        }
        if (this.inBuild()) {
            throw new Error('Relationships are not available during the build phase.');
        }
        if (! this.relationshipsDef[relationship]) {
            throw new RangeError(`No relationship defined: ${relationship}.  Check your .platform.app.yaml file.`);
        }
        if (! this.relationshipsDef[relationship][index]) {
            throw new RangeError(`No index ${index} defined for relationship: ${relationship}.  Check your .platform.app.yaml file.`);
        }

        return this.relationshipsDef[relationship][index];
    }

    variable(name, defaultValue = null) {
        if (!this.isValidPlatform()) {
            return defaultValue;
        }

        return this.variablesDef[name] || defaultValue;
    }

    variables() {
        if (!this.isValidPlatform()) {
            throw new Error('You are not running on Platform.sh, so the variables array is not available.');
        }

        return this.variablesDef;
    }

    application() {
        if (!this.isValidPlatform()) {
            throw new Error('You are not running on Platform.sh, so the application definition is not available.');
        }

        return this.applicationDef;
    }

    get appDir() {
        this._confirmValidPlatform(`You are not running on Platform.sh, so the appDir variable are not available.`);
        return this._getValue('APP_DIR');
    }

    get applicationName() {
        this._confirmValidPlatform('applicationName');
        return this._getValue('APPLICATION_NAME');
    }

    get project() {
        this._confirmValidPlatform('project');
        return this._getValue('PROJECT');
    }

    get treeId() {
        this._confirmValidPlatform('treeId');
        return this._getValue('TREE_ID');
    }

    get entropy() {
        this._confirmValidPlatform('entropy');
        return this._getValue('PROJECT_ENTROPY');
    }

    get branch() {
        this._confirmValidPlatform('branch');
        this._confirmRuntime('branch');
        return this._getValue('BRANCH');
    }

    get environment() {
        this._confirmValidPlatform('environment');
        this._confirmRuntime('environment');
        return this._getValue('ENVIRONMENT');
    }

    get documentRoot() {
        this._confirmValidPlatform('documentRoot');
        this._confirmRuntime('documentRoot');
        return this._getValue('DOCUMENT_ROOT');
    }

    get smtpHost() {
        this._confirmValidPlatform('smtpHost');
        this._confirmRuntime('smtpHost');
        return this._getValue('SMTP_HOST');
    }

    get port() {
        this._confirmValidPlatform('port');
        this._confirmRuntime('port');
        return this.environmentVariables['PORT'];
    }

    get socket() {
        this._confirmValidPlatform('socket');
        this._confirmRuntime('socket');
        return this.environmentVariables['SOCKET'];
    }

    _confirmValidPlatform(property) {
        if (!this.isValidPlatform()) {
            throw new Error(`You are not running on Platform.sh, so the "${property}" variable are not available.`);
        }
        return true;
    }

    _confirmRuntime(property) {
        if (!this.inRuntime()) {
            throw new Error(`The "${property}" variable is not available during build time.`);
        }
        return true;
    }

    _getValue(name) {
        let checkName = this.envPrefix + name.toUpperCase();
        return this.environmentVariables[checkName] || null;
    }

}

function config() {

    return new PlatformConfig();
}

module.exports = {
    config
};


// In testing, also expsoe the class so we can pass in test data.
if (process.env.NODE_ENV === "test") {
    module.exports.PlatformConfig = PlatformConfig;
}

