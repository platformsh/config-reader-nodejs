'use strict';

/**
 * Reads Platform.sh configuration from environment and returns a single object
 */
module.exports = {
  config: function(){
    if (process.env.PLATFORM_PROJECT!=undefined) {
      var conf = {};
      conf.application = read_base64_json('PLATFORM_APPLICATION'); 
      conf.relationships = read_base64_json('PLATFORM_RELATIONSHIPS'); 
      conf.variables = read_base64_json('PLATFORM_VARIABLES'); 
      conf.application_name= process.env.PLATFORM_APPLICATION_NAME;
      conf.app_dir= process.env.PLATFORM_APP_DIR;
      conf.environment = process.env.PLATFORM_ENVIRONMENT;
      conf.project = process.env.PLATFORM_PROJECT; 
      conf.port = process.env.PORT; 
    } else {
      console.log("This is not running on platform.sh");
      return null;
    }
    return conf;
  }
};

function read_base64_json(var_name){
  try {
    return JSON.parse(new Buffer(process.env[var_name], 'base64').toString());
  }
  catch (err) {
    console.log("no " + var_name + " environment variable");
    return null;
  }
}

