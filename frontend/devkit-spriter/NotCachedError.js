function NotCachedError(message) {
  Error.call(this, message);
  this.message = message;
}

NotCachedError.prototype = Object.create(Error.prototype);
NotCachedError.prototype.constructor = NotCachedError;

module.exports = NotCachedError;
