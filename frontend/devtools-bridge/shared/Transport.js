import EventEmitter from 'events';
import debug from 'debug';

const log = debug('devtools:transport');

export default class Transport extends EventEmitter {
  constructor (opts) {
    super();

    this.socket = opts.socket;
    this.callbackID = 0;
    this.callbacks = {};

    this.socket.on('message', payload => this.handleMessage(payload));
  }

  send (payload) {
    log('<--', payload);

    this.socket.send(payload);
  }

  sendEvent (evt, data) {
    const type = 'event';

    this.send({ type, evt, data });
  }

  query (evt, data, callback) {
    const type = 'query';
    const id = ++this.callbackID;

    this.callbacks[id] = callback;
    this.send({ type, id, evt, data });
  }

  handleMessage (payload) {
    log('-->', payload);

    this.emit('message', payload);

    switch (payload.type) {
      case 'query':
        this.handleQuery(payload.id, payload.evt, payload.data);
        break;
      case 'callback':
        this.handleCallback(payload.id, payload.err, payload.data);
        break;
      case 'control':
      case 'event':
      default:
        this.emit(`${payload.type}:${payload.evt}`, payload.data);
    }
  }

  handleQuery (id, evt, data) {
    const type = 'callback';
    const cb = (err, data) => this.send({ type, id, err, data });

    this.emit(`query:${evt}`, cb, data);
  }

  handleCallback (id, err, data) {
    const callback = this.callbacks[id];
    delete this.callbacks[id];

    callback(err, data);
  }
}
