import ObjectPool from 'devtools/lib/ObjectPool';

export default class GenericSerializer extends ObjectPool {
  // This is just a stub over `ObjectPool`. Serializers extending this one should
  // override `obtain(view)` and `release(obj)` methods if needed.
}
