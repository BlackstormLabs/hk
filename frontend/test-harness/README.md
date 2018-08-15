# Test-Harness
This package drives automated testing for our games. It contains scripts that drive testing, and code to be included in tests to make writing them easier.

## [game]/tests
This is your place to put your tests.

Make as many tests as you want. But you need to follow some rules:

* Write your tests in JavaScript or TypeScript.
* Use the [Mocha framework](https://mochajs.org/), and use `assert` or similar within your test so that it can indicate pass or fail.
* Files prepended with a `_` are not automatically run by the `npm test` command. These are useful as includes.
* Files named `smoke.js`; `_game.js` or `_name_of_this_game.js`; and `webpack.config.js` are special. Do not overwrite them.

Special files:

* `smoke.js` contains a suite os smoke tests for this project which are run in continuous integration.
* `_game.js` or `_name_of_this_game.js` is an include for your tests which imports test-harness code as well, for your convenience.
* `webpack.config.js` is used for transpiling your tests prior to executing them via `npm test` which allows you to use TypeScript.

## Dependencies
To successfully run tests you will need to install the following on the system which is running tests:

* chrome browser `brew cask install google-chrome`
* selenium webdriver `brew install chromedriver`

## Use
Prior to running tests, you need to generate a test build.

* `npm run serveTest`: If you are developing tests, or running tests while developing the game, use the command `npm run serveTest` to start up a webpack server. This command is similar to `npm run serve` except that it adds hooks to the build special for running tests.
* `npm run build-test --build-type development` is an alternative which can also generate test builds of any type matching an envs/ file for your project. _Note: Be aware of the fact that these are builds for testing, and thus not suitable for use in production. It is wise to overwrite test builds with `npm run build` before shipping to be sure that your production build is NOT a test build._

Once you have a test build available for testing you can run tests, via `npm test`. The command, `npm test`, when executed from the root of the [game] directory will run all the test scripts in [game]/tests **except** for those prepended with an underscore like **\_game.js**. If you prefer to only run one test, or a couple, then `npm test -- -f yourTest1.js yourTest2.js` is what you want.

For more information about use, the help command is your friend and advisor `npm test -- -h`.