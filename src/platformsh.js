

class PlatformConfig {

    // environment = [];

    // envPrefix = '';

    constructor(env = null, prefix = 'PLATFORM_') {
        this.environment = env || process.env;
        this.envPrefix = prefix;
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

