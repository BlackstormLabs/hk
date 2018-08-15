const noop = o => o;
const defaultAllocSize = 50;
// const debug = true;

export default class ObjectPool {
  constructor (opts = {}) {
    this.stack = [];
    this.pointer = -1;
    this.ctor = opts.ctor || noop;
    this.clear = opts.clear || noop;
    this.allocSize = opts.size || defaultAllocSize;

    this.allocate();
  }

  allocate () {
    this.stack.length += this.allocSize;
  }

  create () {
    return {};
  }

  obtain () {
    let obj;

    if (this.pointer >= 0) {
      obj = this.stack[this.pointer];
      this.stack[this.pointer] = undefined;
      this.pointer--;
    } else {
      obj = this.create();
    }

    return this.ctor(obj);
  }

  release (obj) {
    // if (debug) {
    //   if (typeof obj !== 'object')
    //     throw new Error('Only objects are allowed. Current type: ' + typeof obj);

    //   for (let i = 0, len = this.stack.length; i < len; i++) {
    //     if (obj === this.stack[i])
    //       throw new Error('Object is already in the pool', obj);
    //   }
    // }

    this.pointer++;

    if (this.pointer >= this.stack.length)
      this.allocate();

    this.clear(obj);
    this.stack[this.pointer] = obj;
  }
}
