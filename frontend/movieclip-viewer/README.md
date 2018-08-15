# MovieClip viewer
Viewer for Flash animations converted with [JEFF](https://github.com/Wizcorp/Jeff) and running on timestep

## Testing locally
Install the required packages:
```npm install```

Switch to node version compatible with used electron version:
```nvm use 7.9```

Build and run the electron app:
```npm test```

## Installation
On Mac: run the DMG installer located in `release-builds`
On Windows: run the Windows installer located in `release-builds`
On Linux: run the Debian installer located in `release-builds`

## How to build releases (contributors)
Install `wine`, `mono`, `fakeroot` and `dpkg` (requires [homebrew](https://brew.sh/)):
```brew install wine```
```brew install mono```
```brew install fakeroot```
```brew install dpkg```

Create the installers:
```npm run release```

Installers will be located under `installers` folder.
Installers are named `movieclip-viewer.dmg`, `windows-installer` and `movieclip-viewer_0.1.0_amd64.deb` repectively for mac, windows and linux.

**Note: release build process done accordingly to online [electron packager tutorial](https://www.christianengvall.se/electron-packager-tutorial/)**

## Roadmap

Provide GUI for advanced Jeff features such as:
- regular expressions to ignore images at export time
- ability to split swf files into several jeff files
- ability to combine several swf files into a single jeff file

Provide GUI to improve the understanding/use of the animation substitution system.
