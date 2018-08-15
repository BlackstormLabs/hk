# Game Template

## Environment setup
If this is your first game project, [make sure your dev environment is properly set](https://docs.google.com/document/d/1LCt4b41cRj3F2FJ5-p1JF_olzuB7H7EZQpGoe3_7o_g/edit#).

## How to run the game locally
Install all the dependencies by running:
```
npm install
```
Start the game server by running:
```
npm run serve
```
Finally go to [https://localhost:8020/webpack-dev-server/](https://localhost:8020/webpack-dev-server/) in order to start the game. If prompted, you will have to disable the browser security for that page by clicking `Advanced` then `PROCEED TO LOCALHOST(UNSAFE)`

## Getting started with the implementation
Entry point is the file `src/Application.js`.

Please feel free to rewrite the existing code as it is here only to provide you with a starting point.

**Note:** We are in the process of improving the application initialization, which should make the application file simpler in the future.

## Info on the codebase
The `frontend` folder contains the game engine and the build system.

If you do not need them, you can ignore the `env` and `src/stormcloud` folders along with the `fbapp-config.json ` file. But they need to exist to satisfy the build system.

## Assets

### Images
If not specifically assigned tasks relative to the `metadata.json` files, please ignore them.

### Sounds
A sound API is provided in `src/lib/sounds.js`. Sound config files can be found in `src/conf/soundConfig.js`
