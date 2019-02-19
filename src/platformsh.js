

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

console.debug(process.env.NODE_ENV);

if (process.env.NODE_ENV === "test") {
    module.exports.PlatformConfig = PlatformConfig;
}

