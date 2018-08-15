import debug from 'debug';
import features from '../shared/Features';
import engine from 'ui/engine';

const log = debug('devtools:core');

export default class CorePlugin {
  constructor (opts) {
    this.devtools = opts.devtools;
    this.socket = opts.socket;

    this.initialize();
  }

  initialize () {
    this.devtools.on('launch', this.handleGameLaunch.bind(this));
  }

  handleGameLaunch (app) {
    this.app = app;
    this.engine = engine;

    this.socket.on('event:core:stopLoop', () => {
      this.engine.stopLoop();
    });

    this.socket.on('event:core:startLoop', () => {
      this.engine.startLoop();
    });

    this.socket.on('query:core:toggleLoop', cb => {
      if (this.engine.isRunning())
        this.engine.stopLoop();
      else
        this.engine.startLoop();

      cb(null, this.engine.isRunning());
    });

    this.socket.on('query:core:handshake', cb => {
      const response = {
        version: features['core:version'],
        features: features,
        isRunning: this.engine.isRunning()
      };

      cb(null, response);
    });

    this.socket.on('event:core:ping', data => {
      this.socket.sendEvent('core:ping', data);
    });

    this.socket.on('query:core:isRunning', cb => {
      cb(null, this.engine.isRunning());
    });
  }
}
