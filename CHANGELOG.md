# Changelog

## [2.4.1] - 2021-02-03

### Added

* GitHub actions for tests (`quality-assurance.yaml`) and publishing to npm (`npm-publish.yaml`).

### Changed 

* `config` method can now get an object `{ varPrefix: string }` to specify a different environment variables prefix.

### Removed

* CircleCI action config. 

## [2.3.1] - 2019-11-04

### Added

* `CHANGELOG` added.
* `onDedicated` method that determines if the current environment is a Platform.sh Dedicated environment. Replaces deprecated `onEnterprise` method.

### Changed

* Deprecates `onEnterprise` method - which is for now made to wrap around the added `onDedicated` method. `onEnterprise` **will be removed** in a future release, so update your projects to use `onDedicated` instead as soon as possible.

## [2.3.0] - 2019-09-19

### Added

* `getPrimaryRoute` method for accessing routes marked "primary" in `routes.yaml`.
* `getUpstreamRoutes` method returns an object map that includes only those routes that point to a valid upstream.

## [2.2.5] - 2019-06-04

### Added

* Credential formatter `puppeteerFormatter` that returns Puppeteer connection string for using [Headless Chrome](https://docs.platform.sh/configuration/services/headless-chrome.html) on Platform.sh.

## [2.2.1] - 2019-04-30

### Removed

* Removes the strict guard in place on the `variables` method.

## [2.2.0] - 2019-04-24

### Changed

* Checks for valid environments were relaxed to unbreak use during local development.

## [2.1.0] - 2019-03-22

### Added

* `hasRelationship` method to verify relationship has been defined before attempting to access credentials for it.

### Changed

* BSD-2-Clause to MIT license.

## [2.0.3] - 2019-03-06

### Added

* CircleCI deploy hook added to publish to npm.
