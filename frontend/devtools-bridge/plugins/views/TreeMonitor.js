import EventEmitter from 'events';
import debug from 'debug';
import { throttle } from 'devtools/lib/Utils';

const log = debug('devtools:treeMonitor');

export default class TreeMonitor extends EventEmitter {
  constructor (opts) {
    super();

    this.isRunning = false;
    this.interval = opts.interval;
    this.root = opts.root;
    this.subscriptions = {};
    this.throttledUpdate = throttle(
      this.update.bind(this),
      this.interval,
      { leading: false }
    );
  }

  start () {
    this.isRunning = true;
  }

  stop () {
    this.isRunning = false;
  }

  update () {
    if (!this.isRunning)
      return;

    this.emit('updated');
  }

  subscribe (view) {
    view.subscribe('SubviewAdded', this.throttledUpdate);
    view.subscribe('SubviewRemoved', this.throttledUpdate);

    this.subscriptions[view.uid] = view;
  }

  unsubscribe (view) {
    const sub = this.subscriptions[view.uid];

    if (!sub)
      return;

    view.unsubscribe('SubviewAdded', this.throttledUpdate);
    view.unsubscribe('SubviewRemoved', this.throttledUpdate);

    const subviews = view.getSubviews();

    for (let i = 0, len = subviews.length; i < len; i++)
      if (this.subscriptions[subviews[i].uid])
        this.unsubscribe(subviews[i]);

    delete this.subscriptions[view.uid];
  }
}
