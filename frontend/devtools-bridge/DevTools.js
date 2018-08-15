import EventEmitter from 'events';
import debug from 'debug';
import WindowSocket from './shared/WindowSocket';
import Transport from './shared/Transport';

// Set the global flag that's used throughout engine code.
window.DEBUG = true;

const log = debug('devtools');

export default class DevTools extends EventEmitter {
  constructor (opts) {
    super();

    this.plugins = [];

    this.socket = new WindowSocket({
      source: 'devkit-devtools-bridge',
      target: 'devkit-devtools-content-script'
    });

    this.transport = new Transport({ socket: this.socket });

    this.transport.on('control:bridgeConnected', () => {
      log('Bridge connected');
      this.emit('start');
    });

    this.transport.on('control:bridgeDisconnected', () => {
      log('Bridge disconnected');
      this.emit('pause');
    });

    this.transport.on('event:core:syncSettings', data => {
      this.emit('settings', data.settings);
    });

    for (let i = 0; i < opts.plugins.length; i++) {
      const ModuleCtor = opts.plugins[i];
      const module = new ModuleCtor({
        devtools: this,
        socket: this.transport
      });

      this.plugins.push(module);
    }

    // Establish connection to the content script
    this.transport.send({ type: 'control', evt: 'connect' });
  }

  setApp (app) {
    this.app = app;
    this.emit('launch', app);
  }
}
