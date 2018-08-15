import EventEmitter from 'events';
import ObjectPool from 'devtools/lib/ObjectPool';
import { isEqual } from 'devtools/lib/Utils';

// Use different pools for different view backings since their property sests
// differ
const pools = {
  // Stores default visible views that have only `visible` field monitored
  default: new ObjectPool(),
  // Stores snapshot maps
  snapshot: new ObjectPool()
};

export default class SnapshotMonitor extends EventEmitter {
  constructor (opts) {
    super();

    this.updateInterval = opts.interval;
    this.timer = null;
    this.viewMap = null;
    this.cachedDiff = {};
    this.data = pools.snapshot.obtain();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public
  //////////////////////////////////////////////////////////////////////////////

  stop () {
    if (this.timer)
      clearInterval(this.timer);
  }

  start () {
    this.timer = setInterval(
      this.handleIntervalTick.bind(this),
      this.updateInterval
    );
  }

  setViewMap (viewMap) {
    this.viewMap = viewMap;
    this.stop();
    this.update(false);
    this.start();
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private
  //////////////////////////////////////////////////////////////////////////////

  handleIntervalTick () {
    const updated = this.update(true);

    if (updated)
      this.emit('updated', this.cachedDiff);
  }

  reset () {
    for (const key in this.data) {
      const data = this.data[key];
      pools[data.backingType].release(data);
      delete this.data[key];
    }

    pools.snapshot.release(this.data);
    this.data = null;
  }

  update (performDiff) {
    const viewMap = this.viewMap;
    const snapshot = pools.snapshot.obtain();

    for (const key in viewMap) {
      const vmData = viewMap[key];

      if (!vmData.visible)
        continue;

      const backing = vmData.view.style;
      const type = vmData.selected
        ? this.getBackingType(backing)
        : 'default';
      const pool = type in pools
        ? pools[type]
        : pools[type] = new ObjectPool(type);
      const data = pool.obtain();

      if (vmData.selected) {
        // Monitor complete style of currently selected view
        vmData.view.style.copy(data);
      } else {
        // Monitor only `visible` property for non-selected views
        data.visible = vmData.view.style.visible;
      }

      data.backingType = type;
      snapshot[key] = data;
    }

    let result;

    if (performDiff)
      result = this.createDiff(snapshot);

    this.reset();
    this.data = snapshot;

    return result;
  }

  getBackingType (backing) {
    return backing.constructor.name;
  }

  createDiff (snapshot) {
    const out = this.cachedDiff;
    let changes = 0;

    // Reset the diff object. Do not return objects to their pools here as
    // they're only references to snapshot objects and returned in `reset()`
    // method.
    for (const key in out) {
      delete out[key];
    }

    for (const key in snapshot) {
      const exists = key in this.data;
      if (!exists || !isEqual(this.data[key], snapshot[key])) {
        out[key] = snapshot[key];
        changes++;
      }
    }

    return changes > 0;
  }
}
