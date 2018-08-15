import { i18n } from 'src/lib/i18n';
import { getI18nBundle } from 'src/i18nBundle/index';

import ImageViewCache from 'ui/resource/ImageViewCache';
import BitmapFont from 'ui/bitmapFont/BitmapFont';

var fontCache;

function initializeFontCache() {
  var location = getFontLocation();
  var bundle = getI18nBundle(location);

  var fontImageDirectory = getFontImageDirectory();
  var bitmapFontDataRef = bundle.bitmapFontDataRef;

  fontCache = {
    obelix: new BitmapFont(
      ImageViewCache.getImage(fontImageDirectory + 'obelix/obelix.png'),
      bitmapFontDataRef.obelix
    ),
    obelix_solid: new BitmapFont(
      ImageViewCache.getImage(fontImageDirectory + 'obelix_solid/obelix_solid.png'),
      bitmapFontDataRef.obelix_solid
    ),
    obelix_orange: new BitmapFont(
      ImageViewCache.getImage(fontImageDirectory + 'obelix_orange/obelix_orange.png'),
      bitmapFontDataRef.obelix_orange
    ),
  };
}

export const getFontLocation = function () {
  var locale = i18n.locale;

  if (locale === 'en') {
    return 'latin';
  }

  var bundle = getI18nBundle(locale);

  // If the bundle doesn't have a bitmapFontDataRef, assume latin

  if (!bundle || !bundle.bitmapFontDataRef) {
    locale = 'latin';
  }

  return locale;
};

export const getFontImageDirectory = function () {
  let location = getFontLocation();

  return 'resources/images/fonts/' + location + '/';
};

export default function bitmapFonts(name) {
  // Lazy load font cache so we don't request resources before preloading

  if (!fontCache) {
    initializeFontCache();
  }

  return fontCache[name];
}
