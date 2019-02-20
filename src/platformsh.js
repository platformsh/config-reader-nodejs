'use strict';

let decode = (value) => {
    return JSON.parse(Buffer.from(value, 'base64'));
};

class PlatformConfig {

    // environment = [];

    // envPrefix = '';

    constructor(env = null, prefix = 'PLATFORM_') {
        this.environment = env || process.env;
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
            /*
            if (this.inRuntime() && relationships = this._getValue('RELATIONSHIPS')) {
                this.relationshipsDef = decode(relationships);
            }
            if (let variables = this._getValue('VARIABLES')) {
                this.variablesDef = decode(variables);
            }
            if (let application = this._getValue('APPLICATION')) {
                this.applicationDef = decode($application);
            }
            */
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

    _getValue(name) {
        let checkName = this.envPrefix + name.toUpperCase();
        return this.environment[checkName] || null;
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

