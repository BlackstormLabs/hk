import Promise from 'bluebird';

import { logger } from 'base';


/**
 * facebook.storage API
 * wrapper for storage in FBInstant API
 * @deprecated since version 1.0
 */

export const saveDataAsync = (key, value) => {
  logger.warn(
    'facebook\'s FBInstant.storage.saveDataAsync has been removed, this function is now accessing localStorage directly.'
  );
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
  return Promise.resolve();
}

export const getDataAsync = (key) => {
  var result = '';
  logger.warn(
    'facebook\'s FBInstant.storage.saveDataAsync has been removed, this function is now accessing localStorage directly.'
  );
  try {
    result = localStorage.getItem(key);
  } catch (e) {}
  return Promise.resolve(result);
}
