import debug from 'debug';
import ViewManager from './views/ViewManager';

const log = debug('devtools:viewHierarchy');

export default class ViewHierarchyPlugin {
  constructor (opts) {
    this.socket = opts.socket;

    this.devtools = opts.devtools;
    this.devtools.on('launch', this.handleGameLaunch.bind(this));
    this.devtools.on('pause', this.handlePause.bind(this));
    this.devtools.on('start', this.handleStart.bind(this));
    this.devtools.on('settings', this.handleSettings.bind(this));

    this.handleClickSelectInternal = this.handleClickSelectInternal.bind(this);
    this.clickSelectSubscribed = false;

    window.devtools = this;
  }

  handleGameLaunch (root) {
    this.root = root;
    this.defaultMap = {};
    this.defaultMap[root.uid] = true;

    // Queries
    this.socket.on('query:views:sync', this.handleSyncViews.bind(this));
    this.socket.on('query:views:subscribe', this.handleSubscribe.bind(this));

    // Events
    this.socket.on('event:views:applyStyle', this.handleApplyViewStyle.bind(this));
    this.socket.on('event:views:startClickSelect', this.handleClickSelectStart.bind(this));
    this.socket.on('event:views:endClickSelect', this.handleClickSelectEnd.bind(this));
    this.socket.on('event:views:blink', this.handleBlink.bind(this));

    // Internal bindings
    this.manager = new ViewManager({ root });
    this.manager.on('treeUpdated', this.handleTreeUpdate.bind(this));
    this.manager.on('snapshotUpdated', this.handleSnapshotUpdate.bind(this));
  }

  handlePause () {
    this.manager.stop();
  }

  handleStart () {
    this.manager.start();
  }

  cancelClickSelect (evt) {
    if (!this.clickSelectSubscribed)
      return;

    if (evt)
      evt.cancel();

    this.root.unsubscribe('InputStartCapture', this.handleClickSelectInternal);
    this.clickSelectSubscribed = false;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal
  //////////////////////////////////////////////////////////////////////////////

  handleTreeUpdate (data) {
    this.socket.sendEvent('views:treeUpdated', data);
  }

  handleSnapshotUpdate (data) {
    this.socket.sendEvent('views:snapshotUpdated', data);
  }

  handleClickSelectInternal (evt) {
    this.cancelClickSelect(evt);

    // @TODO Decide if we want to reset the map to show only selected view's parents
    // const map = this.viewMap.expansionMap;
    const map = {};
    const selectedView = evt.target.uid;
    const trace = evt.target.getParents();

    for (let i = 0, len = trace.length; i < len; i++)
      map[trace[i].uid] = true;

    const update = this.manager.updateSubscriptions(map, selectedView);

    this.socket.sendEvent('views:clickSelect', {
      update, map, selectedView
    });

    this.manager.blink(selectedView);
  }

  handleSettings (data) {
    this.manager.setHighlight(data['views:toggleHighlight'], data['views:highlightColor']);
  }

  //////////////////////////////////////////////////////////////////////////////
  // External
  //////////////////////////////////////////////////////////////////////////////

  handleApplyViewStyle (data) {
    this.manager.updateViewStyles(data.uid, data.batch);
  }

  handleSyncViews (cb) {
    const result = this.manager.updateSubscriptions(this.defaultMap, this.root.uid);

    cb(null, result);
  }

  handleSubscribe (cb, data) {
    const result = this.manager.updateSubscriptions(data.map, data.selectedView);

    cb(null, result);
  }

  handleClickSelectStart () {
    if (this.clickSelectSubscribed)
      return;

    this.root.subscribe('InputStartCapture', this.handleClickSelectInternal);
    this.clickSelectSubscribed = true;
  }

  handleClickSelectEnd () {
    this.cancelClickSelect();
  }

  handleBlink (data) {
    this.manager.blink(data.uid);
  }
}
