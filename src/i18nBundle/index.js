import Promise from 'bluebird';
import { i18n } from 'src/lib/i18n';

// Latin is baked in, fallback to this
import * as latin from './latin';

// Rest are lazy loaded
import loadJa from 'bundle-loader?lazy&name=[name]!./ja';


const loadFunctions = {
  ja: loadJa
};


// interface II18nBundle {
//   id: string;
//   strings: any;
//   bitmapFontDataRef: any;
// }

const loadedBundles = {
  latin: latin
};


/**
 * Async load a given locale i18n bundle
 * @param {string} [locale] - Defaults to i18n.locale
 */
export const loadI18nBundle = function (locale) {
  return new Promise((resolve, reject) => {
    if (!locale) {
      locale = i18n.locale;
    }

    const loadFn = loadFunctions[locale];
    if (!loadFn) {
      return resolve(null);
    }

    const existing = getI18nBundle(locale);
    if (existing) {
      return resolve(existing);
    }

    loadFn((i18nBundle) => {
      loadedBundles[locale] = i18nBundle;
      resolve(i18nBundle);
    });
  });
};


/**
 * Synchronously get a loaded locale
 * @param {string} locale
 */
export const getI18nBundle = function (locale) {
  return loadedBundles[locale];
};
