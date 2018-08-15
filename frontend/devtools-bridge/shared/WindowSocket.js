import EventEmitter from 'events';

export default class WindowSocket extends EventEmitter {
  constructor (opts) {
    super();

    this.source = opts.source;
    this.target = opts.target;

    window.addEventListener('message', evt => this.handleMessage(evt));
  }

  send (payload) {
    window.postMessage({ source: this.source, payload }, '*');
  }

  handleMessage (evt) {
    if (evt.source !== window || !evt.data || evt.data.source !== this.target)
      return;

    const payload = evt.data.payload;

    this.emit('message', payload);
    this.emit(`${payload.type}:${payload.evt}`, payload.data);
  }
}
