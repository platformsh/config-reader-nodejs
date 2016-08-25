# platformsh-nodejs-helper

Helper for running nodejs applications on Platform.sh

##Purpose

Reads Platform.sh configuration from environment and returns a single object

##Usage: 

Put in package.json in the dependencies

```json
{
[...]
  "dependencies": {
    "platformsh": "^0.0.3"
  }
}
```
And in your code:

```javascript
var config= require("platformsh").config();
```
