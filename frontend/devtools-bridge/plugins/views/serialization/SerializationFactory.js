import ObjectPool from 'devtools/lib/ObjectPool';
import ImageView from 'ui/ImageView';
import ImageScaleView from 'ui/ImageScaleView';

import ViewSerializer from './ViewSerializer';
import ImageViewSerializer from './ImageViewSerializer';
import ImageScaleViewSerializer from './ImageScaleViewSerializer';

const TYPES = {
  ViewSerializer: 1,
  ImageViewSerializer: 2,
  ImageScaleViewSerializer: 3
};

class SerializationFactory {
  constructor () {
    // Serializers are subclasses of `ObjectPool` that have customized `obtain()`
    // and `release()` methods. The main point of having them is to use separate
    // object pools for different types of views so that each type can have
    // it's own set of serialized properties.
    this.serializers = {};
    this.serializers[TYPES.ViewSerializer] = new ViewSerializer();
    this.serializers[TYPES.ImageViewSerializer] = new ImageViewSerializer();
    this.serializers[TYPES.ImageScaleViewSerializer] = new ImageScaleViewSerializer();

    // Have a pool for each unique view backing style
    this.stylePools = {};
  }

  serialize (view, styleObj) {
    let serializer;

    // Basic logic of defining a serializer type.
    if (view instanceof ImageScaleView) {
      serializer = TYPES.ImageScaleViewSerializer;
    } else if (view instanceof ImageView) {
      serializer = TYPES.ImageViewSerializer;
    } else {
      serializer = TYPES.ViewSerializer;
    }

    const includeStyle = !styleObj;
    const data = this.serializers[serializer].obtain(view);
    const backingType = this.getBackingType(view);

    // Generic view data
    data.serializer = serializer;
    data.uid = view.uid;
    data.className = view.constructor.name;
    data.tag = view.tag;

    // Specify whether the style object was taken from the local pools. Need this
    // for release purposes later.
    data.releaseStyle = includeStyle;

    // View backing class used to identify object pool
    data.backingType = backingType;

    // If style object is not specified, take it from a pool and serialize styles
    if (includeStyle) {
      // Create a new pool if necessary
      if (!this.stylePools[backingType])
        this.stylePools[backingType] = new ObjectPool();

      styleObj = this.stylePools[backingType].obtain();
      view.style.copy(styleObj);
    }

    data.style = styleObj;

    return data;
  }

  release (obj) {
    if (!obj.serializer)
      throw new Error('No serializer specified');

    // Release style object if it was obtained from one of the local pools
    if (obj.releaseStyle)
      this.stylePools[obj.backingType].release(obj.style);

    // Delete style object since it has been released into a pool
    delete obj.style;

    this.serializers[obj.serializer].release(obj);
  }

  getBackingType (view) {
    return view.style.constructor.name;
  }
}

export default new SerializationFactory();
