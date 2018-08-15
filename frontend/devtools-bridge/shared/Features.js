// Hashmap of features and their versions. It's sent with handshake payload
// and then compared on the extension side to enable or disable specific
// functions. Increment feature's version here if breaking changes are introduced.
export default {
  // Core features version
  'core:version': 1,

  // View hierarchy plugin
  'viewHierarchy:clickSelect': 1,
  'viewHierarchy:highlightView': 1
};
