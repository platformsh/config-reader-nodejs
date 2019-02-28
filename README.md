# platformsh-nodejs-helper

Helper for running nodejs applications on Platform.sh.

## Purpose

Reads [Platform.sh configuration](https://docs.platform.sh/development/variables.html) from environment and returns a single object.

## Usage:
```bash
npm install platformsh-config --save
```
And in your code:

```javascript
const config = require('platformsh-config').config();
```
