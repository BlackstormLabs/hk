import debug from 'debug';
import EventEmitter from 'events';
import Promise from 'bluebird';
import ViewBacking from 'ui/backend/canvas/ViewBacking';
import ObjectPool from 'devtools/lib/ObjectPool';
import TreeMonitor from './TreeMonitor';
import SnapshotMonitor from './SnapshotMonitor';
import SerializationFactory from './serialization/SerializationFactory';

const log = debug('devtools:viewMap');

const pools = {
  // Stores current view map representation nodes
  current: new ObjectPool(),
  // Store views and their visibility
  views: new ObjectPool()
};

// Clear a map object and return it's items to pool
const clearMapObject = (obj, pool) => {
  for (const key in obj) {
    if (pool)
      pool.release(obj[key]);
    delete obj[key];
  }
};

// Recursively clear and return objects to pool
const clearViewTreeObject = obj => {
  if (obj.children) {
    for (let i = 0, len = obj.children.length; i < len; i++)
      clearViewTreeObject(obj.children[i]);
    obj.children = null;
  }

  pools.current.release(obj);
};

export default class ViewManager extends EventEmitter {
  constructor (opts) {
    super();

    this.root = opts.root;
    this.selectedView = this.root.uid;
    this.viewMap = {};
    this.viewMap[this.root.uid] = { view: this.root, visible: true };
    this.viewTree = {};
    this.serializedMap = {};
    this.cachedResult = {};
    this.cachedSnapshotUpdate = {};
    this.subscriptions = {};

    this.monitor = new TreeMonitor({ interval: 500, root: this.root });
    this.monitor.on('updated', this.handleTreeUpdate.bind(this));

    this.snapshot = new SnapshotMonitor({ interval: 500 });
    this.snapshot.on('updated', this.handleSnapshotUpdate.bind(this));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public
  //////////////////////////////////////////////////////////////////////////////

  start () {
    this.monitor.start();
    this.snapshot.start();
    log('monitoring started');
  }

  stop () {
    this.monitor.stop();
    this.snapshot.stop();
    log('monitoring stopped');
  }

  getData () {
    this.cachedResult.tree = this.viewTree;
    this.cachedResult.map = this.serializeMap();
    return this.cachedResult;
  }

  updateSubscriptions (map, uid) {
    // Update expansion map. It's used to determine visible nodes and subscribe
    // to those.
    this.expansionMap = map;

    if (this.highlighting && this.selectedView !== uid)
      this.highlightView(this.selectedView, false);

    // Based on whether a view is currently selected, we'll either monitor it's
    // complete style or `visible` property only.
    this.selectedView = uid;

    // Clear the subscription map and update both map and tree
    this.updateMap();

    if (this.highlighting)
      this.highlightView(uid, true);

    return this.getData();
  }

  updateViewStyles (uid, opts) {
    const data = this.viewMap[uid];

    if (!data)
      throw new Error('View not found: ' + uid);

    data.view.updateOpts(opts);
  }

  setHighlight (val, style) {
    this.highlighting = val;
    ViewBacking.HIGHLIGHT_STYLE = style;

    this.highlightView(this.selectedView, this.highlighting);
  }

  blink (uid) {
    const viewData = this.viewMap[uid];
    const view = viewData.view;

    // Do not bother with invisible views
    if (!viewData.visible)
      return;

    const interval = 100;
    const blinkCount = 4;

    const toggle = highlight => {
      view.style.__highlight(highlight);
      return Promise.delay(interval);
    };

    let promise = Promise.resolve();

    for (let i = 1; i <= blinkCount; i++)
      promise = promise.then(() => toggle(i % 2 !== 0));

    promise.then(() => {
      if (this.highlighting && this.selectedView === uid)
        return toggle(true);
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private
  //////////////////////////////////////////////////////////////////////////////

  highlightView (uid, val) {
    this.viewMap[uid].view.style.__highlight(val);
  }

  handleSnapshotUpdate (styles) {
    // Release old objects
    for (const key in this.cachedSnapshotUpdate) {
      SerializationFactory.release(this.cachedSnapshotUpdate[key]);
      delete this.cachedSnapshotUpdate[key];
    }

    // And prepare update data
    for (const key in styles) {
      this.cachedSnapshotUpdate[key] = SerializationFactory.serialize(this.viewMap[key].view/*, styles[key]*/);
    }

    this.emit('snapshotUpdated', this.cachedSnapshotUpdate);
  }

  handleTreeUpdate () {
    this.updateMap();
    this.emit('treeUpdated', this.getData());
  }

  subscribe (uid) {
    if (this.subscriptions[uid])
      return;

    this.monitor.subscribe(this.viewMap[uid].view);
    this.subscriptions[uid] = true;
  }

  unsubscribe (uid) {
    if (!this.subscriptions[uid])
      return;

    this.monitor.unsubscribe(this.subscriptions[uid]);
    delete this.subscriptions[uid];
  }

  updateMap () {
    // First, clear the map
    clearMapObject(this.viewMap, pools.views);
    clearViewTreeObject(this.viewTree);

    // Then generate new map and tree
    this.viewTree = this.walkViews(this.root, true);
    this.snapshot.setViewMap(this.viewMap);

    // Unsubscribe from the old views
    for (const uid in this.subscriptions) {
      if (!this.viewMap[uid]) {
        this.unsubscribe(uid);
      }
    }
  }

  walkViews (view, parentExpanded) {
    const uid = view.uid;
    const subviews = view.getSubviews();
    const len = subviews.length;
    const hasChildren = len > 0;
    const data = pools.current.obtain();

    data.uid = uid;
    data.hasChildren = hasChildren;
    data.children = null;

    const viewMapData = pools.views.obtain();

    viewMapData.view = view;
    viewMapData.visible = parentExpanded;
    viewMapData.selected = this.selectedView === uid;

    this.viewMap[uid] = viewMapData;

    // Make sure to subscribe only to visible views
    if (parentExpanded)
      this.subscribe(uid);

    // Bail out if view's parent is not expanded, since it's not visible
    if (!hasChildren || !parentExpanded)
      return data;

    const children = [];
    const expanded = this.expansionMap[uid];

    for (let i = 0, len = subviews.length; i < len; i++) {
      const childView = subviews[i];
      const childData = this.walkViews(childView, expanded);
      children.push(childData);
    }

    data.children = children;
    return data;
  }

  serializeMap () {
    // Release old objects
    for (const uid in this.serializedMap) {
      SerializationFactory.release(this.serializedMap[uid]);
      delete this.serializedMap[uid];
    }

    for (const uid in this.viewMap) {
      if (this.viewMap[uid].visible) {
        this.serializedMap[uid] = SerializationFactory.serialize(this.viewMap[uid].view);
      }
    }

    return this.serializedMap;
  }
}
