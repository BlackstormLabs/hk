import Promise from 'bluebird';
import FBInstant from './FBInstant';

/**
 * @class FBInstantContextWrapper
 *
 * FBInstantContextWrapper wraps the FBInstant context API, FBInstant.context,
 * updated through FBInstant 4.0, and substitures mock behavior during
 * development in the simulator.
 *
 * Docs: https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant4.1
 */



class FBInstantContextWrapper {

  /**
   * @method context.getID
   *
   * A unique identifier for the current game context. This represents a specific
   * context that the game is being played in. For example a particular messenger
   * conversation or facebook post. This identifier will be populated only after
   * FBInstant.startGameAsync resolves, and may be updated when
   * FBInstant.updateAsync resolves. It will return null if the current mobile
   * app version doesn't support context id, or when the game is being played
   * in a solo context.
   *
   * @returns {string|null}
   */

  getID () {
    return FBInstant.context.getID();
  }



  /**
   * @method context.getType
   *
   * Type of the current game context. Could be
   * 'POST', 'THREAD', 'GROUP', 'MATCH', or 'SOLO'.
   *
   * @returns {string|null}
   */

  getType () {
    return FBInstant.context.getType();
  }



  /**
   * @method context.switchAsync
   *
   * Attempts to switch into a specific context. If the player does not have
   * permission to enter that context, or if the player does not provide
   * permission for the game to enter that context, this will reject. Otherwise,
   * the promise will resolve when the game has switched into the
   * specified context.
   *
   * @returns {Promise}
   */

  switchAsync (contextID) {
    return Promise.try(() => {
      return FBInstant.context.switchAsync(contextID);
    });
  }



  /**
   * @method context.chooseAsync
   *
   * Opens a context selection menu for the player. If the player selects an
   * available context, we attempt to switch into that context, and resolve if
   * successful. Otherwise, if the player exits the menu or we fail to switch into
   * the new context, we reject.
   *
   * @arg {Object} [opts]
   * @arg {string[]} [opts.filters]
   * @arg {number} [opts.minSize]
   * @arg {number} [opts.maxSize]
   *
   * @returns {Promise}
   */

  chooseAsync (opts) {
    return Promise.try(() => {
      return FBInstant.context.chooseAsync(opts);
    });
  }



  /**
   * @method context.createAsync
   *
   * Attempts to create or switch into a context between a specified player and
   * the current player. The returned promise will reject if the player listed
   * is not a Connected Player of the current player or if the player does not
   * provide permission to enter the new context. Otherwise, the promise will
   * resolve when the game has switched into the new context.
   *
   * @returns {Promise}
   */

  createAsync (playerID) {
    return Promise.try(() => {
      return FBInstant.context.createAsync(playerID);
    });
  }



  /**
   * @method context.getPlayersAsync
   *
   * Gets an array of #contextplayer objects containing information about active
   * players that are associated with the current context. This may include the
   * current player.
   *
   * @returns {Promise<Array<ContextPlayer>>}
   */

  getPlayersAsync () {
    return Promise.try(() => {
      return FBInstant.context.getPlayersAsync();
    });
  }



  /**
   * @method context.isSizeBetween
   *
   * This function determines whether the number of participants in the current
   * game context is between a given minimum and maximum, inclusive. If one of
   * the bounds is null only the other bound will be checked against. It will
   * always return the original result for the first call made in a context in a
   * given game play session. Subsequent calls, regardless of arguments, will
   * return the answer to the original query until a context change occurs and
   * the query result is reset.
   *
   * @arg {number} minSize
   * @arg {number} maxSize
   * @returns {boolean}
   */

  isSizeBetween (minSize, maxSize) {
    return FBInstant.context.isSizeBetween(minSize, maxSize);
  }

};



// Singleton Export
export default new FBInstantContextWrapper();
