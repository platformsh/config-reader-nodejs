'use strict';

class NotValidPlatformError extends Error {}

class BuildTimeVariableAccessError extends Error {}

class NoCredentialFormatterFoundError extends Error {}

/**
 * Decodes a Platform.sh environment variable.
 *
 * @param {string} value
 *   Base64-encoded JSON (the content of an environment variable).
 *
 * @return {any}
 *   An associative array (if representing a JSON object), or a scalar type.
 */
function decode(value) {
    return JSON.parse(Buffer.from(value, 'base64'));
}

/**
 * Class representing a Platform.sh environment configuration.
 */
class Config {

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
        this.credentialFormatters = {};

        if (!this.isValidPlatform()) {
            return;
        }

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

            this.registerFormatter('solr-node', nodeSolrFormatter);
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

    /**
     * Callback for adding two numbers.
     *
     * @callback registerFormatterCallback
     * @param {object} credentials
     *   A credential array, as returned by the credentials() method.
     * @return {mixed}
     *   The formatted credentials. The format will vary depending on the
     *   client library it is intended for, but usually either a string or an object.
     */

    /**
     * Adds a credential formatter to the configuration.
     *
     * A credential formatter is responsible for formatting the credentials for a relationship
     * in a way expected by a particular client library.  For instance, it can take the credentials
     * from Platform.sh for a PostgreSQL database and format them into a URL string expected by
     * a particular PostgreSQL client library.  Use the formattedCredentials() method to get
     * the formatted version of a particular relationship.
     *
     * @param {string} name
     *   The name of the formatter.  This may be any arbitrary alphanumeric string.
     * @param {registerFormatterCallback} formatter
     *   A callback function that will format relationship credentials for a specific client library.
     *
     */
    registerFormatter(name, formatter) {
        this.credentialFormatters[name] = formatter;
    }

    /**
     *
     * @param {string} relationship
     *   The relationship whose credentials should be formatted.
     * @param {string} formatter
     *   The registered formatter to use.  This must match a formatter previously registered
     *   with registerFormatter().
     *
     */
    formattedCredentials(relationship, formatter) {
        if (!this.credentialFormatters.hasOwnProperty(formatter)) {
            throw new NoCredentialFormatterFoundError(`There is no credential formatter named "${formatter}" registered. Did you remember to call registerFormatter()?`);
        }

        return this.credentialFormatters[formatter](this.credentials(relationship));
    }

    /**
     * Checks whether the code is running on a platform with valid environment variables.
     *
     * @return {boolean}
     *   True if configuration can be used, false otherwise.
     */
    isValidPlatform() {
        return Boolean(this._getValue('APPLICATION_NAME'));
    }

    /**
     * Checks whether the code is running in a build environment.
     *
     * If false, it's running at deploy time.
     *
     * @return {boolean}
     */
    inBuild() {
        return this.isValidPlatform() && !this._getValue('ENVIRONMENT');
    }

    /**
     * Checks whether the code is running in a runtime environment.
     *
     * @return {boolean}
     */
    inRuntime() {
        return this.isValidPlatform() && Boolean(this._getValue('ENVIRONMENT'));
    }

    /**
     * Determines if the current environment is a Platform.sh Enterprise environment.
     *
     * @return {boolean}
     *   True on an Enterprise environment, False otherwise.
     */
    onEnterprise() {
        return this.isValidPlatform() && this._getValue('MODE') === 'enterprise';
    }

    /**
     * Determines if the current environment is a production environment.
     *
     * Note: There may be a few edge cases where this is not entirely correct on Enterprise,
     * if the production branch is not named `production`.  In that case you'll need to use
     * your own logic.
     *
     * @return {boolean}
     *   True if the environment is a production environment, false otherwise.
     *   It will also return false if not running on Platform.sh or in the build phase.
     */
    onProduction() {
        if (!this.inRuntime()) {
            return;
        }

        let prodBranch = this.onEnterprise() ? 'production' : 'master';

        return this._getValue('BRANCH') === prodBranch;
    }

    /**
     * Returns the routes definition.
     *
     * @return {object}
     *   The routes definition object.
     * @throws {Error}
     *   If the routes are not accessible due to being in the wrong environment.
     */
    routes() {
        if (!this.isValidPlatform()) {
            throw new NotValidPlatformError('You are not running on Platform.sh, so routes are not available.');
        }

        if (this.inBuild()) {
            throw new BuildTimeVariableAccessError('Routes are not available during the build phase.');
        }

        return this.routesDef;
    }

    /**
     * Returns a single route definition.
     *
     * Note: If no route ID was specified in routes.yaml then it will not be possible
     * to look up a route by ID.
     *
     * @param {string} id
     *   The ID of the route to load.
     * @return {object}
     *   The route definition.  The generated URL of the route is added as a "url" key.
     * @throws {Error}
     *   If there is no route by that ID, an exception is thrown.
     */
    getRoute(id) {
        // eslint-disable-next-line no-unused-vars
        for (const [url, route] of Object.entries(this.routes())) {
            if (route.id === id) {
                return route;
            }
        }

        throw new Error(`No such route id found: ${id}`);
    }

    /**
     * Retrieves the credentials for accessing a relationship.
     *
     * The relationship must be defined in the .platform.app.yaml file.
     *
     * @param {string} relationship
     *   The relationship name as defined in .platform.app.yaml.
     * @param {int} index
     *   The index within the relationship to access.  This is always 0, but reserved
     *   for future extension.
     * @return {object}
     *   The credentials array for the service pointed to by the relationship.
     * @throws {Error}
     *   Thrown if called in a context that has no relationships (eg, in build)
     * @throws {RangeError}
     *   If the relationship/index pair requested does not exist.
     */
    credentials(relationship, index = 0) {
        if (!this.isValidPlatform()) {
            throw new NotValidPlatformError('You are not running on Platform.sh, so relationships are not available.');
        }
        if (this.inBuild()) {
            throw new BuildTimeVariableAccessError('Relationships are not available during the build phase.');
        }
        if (!this.relationshipsDef[relationship]) {
            throw new RangeError(`No relationship defined: ${relationship}.  Check your .platform.app.yaml file.`);
        }
        if (!this.relationshipsDef[relationship][index]) {
            throw new RangeError(`No index ${index} defined for relationship: ${relationship}.  Check your .platform.app.yaml file.`);
        }

        return this.relationshipsDef[relationship][index];
    }

    /**
     * Returns a variable from the VARIABLES array.
     *
     * Note: variables prefixed with `env:` can be accessed as normal environment variables.
     * This method will return such a variable by the name with the prefix still included.
     * Generally it's better to access those variables directly.
     *
     * @param {string} name
     *   The name of the variable to retrieve.
     * @param {any} defaultValue
     *   The default value to return if the variable is not defined. Defaults to null.
     * @return mixed
     *   The value of the variable, or the specified default.  This may be a string or an array.
     */
    variable(name, defaultValue = null) {
        if (!this.isValidPlatform()) {
            return defaultValue;
        }

        return this.variablesDef.hasOwnProperty(name) ? this.variablesDef[name] : defaultValue;
    }

    /**
     * Returns the full variables array.
     *
     * If you're looking for a specific variable, the variable() method is a more robust option.
     * This method is for cases where you want to scan the whole variables list looking for a pattern.
     *
     * @return {object}
     *   The full variables definition.
     */
    variables() {
        if (!this.isValidPlatform()) {
            throw new NotValidPlatformError('You are not running on Platform.sh, so the variables array is not available.');
        }

        return this.variablesDef;
    }

    /**
     * Returns the application definition object.
     *
     * This is, approximately, the .platform.app.yaml file as a nested array.  However, it also
     * has other information added by Platform.sh as part of the build and deploy process.
     *
     * @return {object}
     *   The application definition object.
     */
    application() {
        if (!this.isValidPlatform()) {
            throw new NotValidPlatformError('You are not running on Platform.sh, so the application definition is not available.');
        }

        return this.applicationDef;
    }

    /**
     * The absolute path to the application directory.
     *
     * @returns {string}
     */
    get appDir() {
        this._confirmValidPlatform('You are not running on Platform.sh, so the appDir variable are not available.');
        return this._getValue('APP_DIR');
    }

    /**
     * The name of the application container, as configured in the .platform.app.yaml file.
     *
     * @returns {string}
     */
    get applicationName() {
        this._confirmValidPlatform('applicationName');
        return this._getValue('APPLICATION_NAME');
    }

    /**
     * The project ID.
     *
     * @returns {string}
     */
    get project() {
        this._confirmValidPlatform('project');
        return this._getValue('PROJECT');
    }

    /**
     * The ID of the tree the application was built from.
     *
     * This is essentially the SHA hash of the tree in Git. If you need a unique ID
     * for each build for whatever reason this is the value you should use.
     *
     * @returns {string}
     */
    get treeId() {
        this._confirmValidPlatform('treeId');
        return this._getValue('TREE_ID');
    }

    /**
     * The project project entropy value.
     *
     * This random value is created when the project is first created, which is then stable
     * throughout the project’s life. It should be used for application-specific unique-instance
     * hashing.
     *
     * @returns {string}
     */
    get projectEntropy() {
        this._confirmValidPlatform('projectEntropy');
        return this._getValue('PROJECT_ENTROPY');
    }

    /**
     * The name of the Git branch.
     *
     * @returns {string}
     */
    get branch() {
        this._confirmValidPlatform('branch');
        this._confirmRuntime('branch');
        return this._getValue('BRANCH');
    }

    /**
     * The name of the environment generated by the name of the Git branch.
     *
     * @returns {string}
     */
    get environment() {
        this._confirmValidPlatform('environment');
        this._confirmRuntime('environment');
        return this._getValue('ENVIRONMENT');
    }

    /**
     * The absolute path to the web document root, if applicable.
     *
     * @returns {string}
     */
    get documentRoot() {
        this._confirmValidPlatform('documentRoot');
        this._confirmRuntime('documentRoot');
        return this._getValue('DOCUMENT_ROOT');
    }

    /**
     * The SMTP host to use for sending email.
     *
     * If empty, it means email sending is disabled in this environment.
     *
     * @returns {string}
     */
    get smtpHost() {
        this._confirmValidPlatform('smtpHost');
        this._confirmRuntime('smtpHost');
        return this._getValue('SMTP_HOST');
    }

    /**
     * The TCP port number the application should listen to for incoming requests.
     *
     * @returns {string}
     */
    get port() {
        this._confirmValidPlatform('port');
        this._confirmRuntime('port');
        return this.environmentVariables['PORT'];
    }

    /**
     * The Unix socket the application should listen to for incoming requests.
     *
     * @returns {string}
     */
    get socket() {
        this._confirmValidPlatform('socket');
        this._confirmRuntime('socket');
        return this.environmentVariables['SOCKET'];
    }

    /**
     * Internal utility to simplify validating that a request is made on a valid Platform.
     *
     * @param {string} property
     *   The variable that will be accessed if the environment is valid, or is missing otherwise.
     * @returns {boolean}
     *   True if running on a valid Platform, false otherwise.
     * @private
     */
    _confirmValidPlatform(property) {
        if (!this.isValidPlatform()) {
            throw new NotValidPlatformError(`You are not running on Platform.sh, so the "${property}" variable are not available.`);
        }
        return true;
    }

    /**
     * Internal utility to simplify validating that a request is made during runtime.
     *
     * @param {string} property
     *   The variable that will be accessed if the environment is at runtime, or is missing otherwise.
     * @returns {boolean}
     *   True if running in runtime, false otherwise.
     * @private
     */
    _confirmRuntime(property) {
        if (!this.inRuntime()) {
            throw new BuildTimeVariableAccessError(`The "${property}" variable is not available during build time.`);
        }
        return true;
    }

    /**
     * Reads an environment variable, taking the prefix into account.
     *
     * @param {string} name
     *   The variable to read.
     * @return {string|null}
     */
    _getValue(name) {
        let checkName = this.envPrefix + name.toUpperCase();

        return this.environmentVariables[checkName] || null;
    }
}


/**
 * Returns a connection object appropriate for the solr-node library.
 *
 * @param credentials
 *   A solr credentials object.
 * @returns {object}
 *   A credentials object to pass to new SolrNode().
 * @private
 */
function nodeSolrFormatter(credentials) {
    return {
        host: credentials.host,
        port: credentials.port,
        core: credentials.path.split('/').slice(-1)[0],
        protocol: 'http'
    }
}

/**
 * Creates a new Config instance that represents the current environment.
 *
 * @returns {Config}
 */
function config() {

    return new Config();
}

module.exports = {
    config
};

// In testing, also expsoe the class so we can pass in test data.
if (process.env.NODE_ENV === 'test') {
    module.exports.Config = Config;
}

