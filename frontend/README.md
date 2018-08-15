# Frontend Core Technology

The Frontend Core Technology repository (FCT) contains shared code for frontend development and builds of Blackstorm Labs games. This repository is designed to be used as a submodule in a game project. It simplifies propagating core tech improvements across repos.

## Code

The code contained in this repo, broken down by folder:

* **`template`** Files to be brought into the game project and modified to suit, or files which must be in the project root to work properly. We attempt to keep this as minimal as possible.
* **`arson`** Code run at build time. Compiles Javascript and Typescript, implements art pipeline, and checks development environment to ensure successful builds.
* **`devkit-core`** Game runtime code. Timestep (game engine), squill (UI widget library), and client API (abstracts from some messenger/browser APIs, wraps analytics, bootstraps game, etc.).
* **`devkit-*`** Assorted small modules starting with `devkit-` which support development but don't need to be in `devkit-core`. Currently FBMessenger abstraction, but will probably expand over time.
* **`jsio`** Utility library: math, networking, events, XML/JSON/base64/etc, and other support code.

## Usage

Submodules allow faster and easier code sharing. They also add friction around per-game changes, which helps keep game code in game repos and shared code in shared repos. In general, we want to minimize the submodules in a project - we should not have more than 2 or 3. Nesting submodules are especially to be avoided because they exponentially complicate workflow.

```
# First time repo setup. npm install will automatically update the subrepos.
npm install

# To modify a submodule
cd yourModule
git add && git commit -m "A submodule change."
git push origin targetbranch
cd ..
git add yourModule
git commit -m "Tracking frontend submodule"
git push origin

# to update a project with a submodule
git pull origin
```

If you use the `.gitmodules` from the `templates` folder, it adds some configuration options to assist with submodule usage.

Some notes on workflow:
* **Common mistakes this workflow catches:**
    * You made a change in submodule but didn't commit it.
    * You committed to the submodule but didn't commit its change to the container repo
* **Common mistakes this workflow doesn't catch:**
    * You forgot to push the submodule (only discovered on fresh checkout)
    * You forgot to push the container (much easier to avoid)

## Integrating FCT Into Game Projects

Basic steps (see below for more info):

1. Copy files from `template/` into root of your game repo. (If you already have some or all of these files, you will want to review diffs and merge your config values/tweaks so they aren't lost.)
2. `git submodule add -b master https://github.com/BlackstormLabs/coretech_frontend frontend` to bring the submodule into your project. You should see that the FCT repo is present in the `frontend` folder.
3. `git add .gitmodules` to also include the submodule configuration. This is important to help reduce the opportunity for subtle mistakes while working with the submodule.
4. `git commit -m "Frontend submodule"` to capture the above changes.
5. If you've successfully merged root `package.json` contents, then running `npm install` will initialize the `frontend` submodule making it ready to be used.

To create a new game project using this shared repo, or to move an existing project onto this system, you should copy the contents of `template` to the root of the game repo. In the case of an existing project we strongly recommend carefully reviewing the introduced changes to make sure important local game state is not overwritten.

**IMPORTANT:** There are hidden files in the template folder. Make sure you copy them over.

If you need to update a project already using FCT, we strongly recommend using Beyond Compare or another mature merge tool to bring the changes over. The files in `template` are small and focused so they should not take more than 10 minutes to merge and verify.

Remember to run `npm install` in the root folder of your project to initialize the `frontend` submodule before it can be used.

## Expected Project Structure

FCT expects the following directories and files to be present in the containing repository:

* `envs/` contains build configurations.
* `gcf/` contains code unique to the Google Cloud Function for this game.
* `resources/` contains game resources. `resources-*` end in country codes and contain localized resources.
* `src/` contains the game source code.
* `vendor/` contains copies of all of the npm modules used at runtime for the game. We don't use `node_modules` for the game build - it's only used at build time.
* `spritesheetCompressionOverrides.json` contains image compression settings overrides.
* Some individual files are also required: `tsconfig.json`, `fbapp-config.json`, `package.json`, `.eslintrc.json`, `.eslintignore`, `.babelrc`.

If you move from an existing project to FCT, you will need to reconcile your existing files with the new ones.

### Updating `vendor/` Dependencies

Vendor dependencies are updated in one of two ways:

#### From `npm`

```bash
# Remove any existing vendor entry
rm -rf vendor/semver
# Install the library that you want using npm
npm install --no-save semver
# Move the installed library in to vendor/
mv node_modules/semver vendor/
```

#### From `git`

```bash
# Remove any existing vendor entry
rm -rf vendor/@blackstormlabs/flatline
# Clone the library in to vendor
# Note: Make sure to properly represent scoped modules within the directory structure of vendor/
cd vendor/@blackstormlabs
git clone https://github.com/BlackstormLabs/flatline
# Strip .git from the new directory
rm -rf flatline/.git
```

#### Dependency dependencies

Some libraries will require other libraries.  Once you move the library you want in to `vendor/`, make sure to run the app, and ensure all functionality is still as expected.

If you see errors about missing libraries, repeat steps above for each missing library in question.

### Supported Environment Flags

**Note:** This is a work in progress and many existing flags are not listed here just yet.

#### General
- `NODE_ENV` (values: `development` | `production`, default: `development`): Sets the output directory for the build, as well as several other switches (code minification, obfusctation, image compression etc.).
- `SIMULATED` (default: `false`): Enables use of the devtools chrome extension.

#### Entry points
- `BUILD_GCF_ENTRY` (default: `src/server/index`): GCF build entry point.
- `BUILD_GCF_SCHEMA` (default: `src/stormcloud/clientSchema`): GCF client schema.
- `BUILD_BROWSER_ENTRY` (default: `src/Application`): Browser entry point.

#### Image compression
- `IMAGE_COMPRESS_FULL` (default: `false`): Whether to perform full image compression (enabled by default for production builds).
- `IMAGE_LOW_RES` (default: `true`): Whether to generate low res versions of spritesheets.
- `IMAGE_CACHE_LOCATION` (default: `.cache/sprites`): Specifies image compression cache location. Useful if you don't want to overwrite production cache with development uncompressed cache.
