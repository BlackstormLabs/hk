// Lodash essentials. These are imported from `frontend/node_modules/lodash`
// to not bundle them under `vendor/` folder with each project.
// @TODO Consider adding `frontend/node_modules` folder to webpack module lookup
// dir list.
import isEqual from 'frontend/node_modules/lodash/isEqual';
import throttle from 'frontend/node_modules/lodash/throttle';

export { isEqual, throttle };
