import ViewSerializer from './ViewSerializer';

export default class ImageViewSerializer extends ViewSerializer {
  obtain (view) {
    const res = super.obtain(view);

    res.image = view._img
      ? view._img.getOriginalURL()
      : undefined;

    return res;
  }

  release (obj) {
    obj.image = undefined;
    super.release(obj);
  }
}
