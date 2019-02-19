

class PlatformConfig {

    // environment = [];

    constructor(env = null, prefix = 'PLATFORM_') {
        this.environment = env || process.env;
    }

    isValidPlatform() {
        return false;
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

