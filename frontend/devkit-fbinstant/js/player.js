import Promise from 'bluebird';
import FBInstant from './FBInstant';

/**
 * @class FBInstantPlayerWrapper
 *
 * FBInstantPlayerWrapper wraps the FBInstant player API, FBInstant.player,
 * updated through FBInstant 4.1, and substitures mock behavior during
 * development in the simulator.
 *
 * Docs: https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant4.1
 */



class FBInstantPlayerWrapper {

  /**
   * @method player.getID
   *
   * A unique identifier for the player. This should remain the same for the
   * same Facebook user. The same Facebook user won't have the same identifier
   * when in different game apps. The value will always be null until
   * FBInstant.initializeAsync() resolves.
   *
   * @returns {string|null}
   */

  getID () {
    return FBInstant.player.getID();
  }



  /**
   * @method player.getName
   *
   * The player's localized display name. The value will always be null until
   * FBInstant.initializeAsync() resolves.
   *
   * @returns {string|null}
   */

  getName () {
    return FBInstant.player.getName();
  }



  /**
   * @method player.getPhoto
   *
   * A url to the player's public profile photo. The photo will always be a
   * square, and with dimensions of at least 200x200. When rendering it in the
   * game, the exact dimensions should never be assumed to be constant.
   * It's recommended to always scale the image to a desired size before
   * rendering. The value will always be null until FBInstant.initializeAsync()
   * resolves.
   *
   * WARNING: Due to CORS, using these photos in the game canvas can cause it to
   * be tainted, which will prevent the canvas data from being extracted.
   * To prevent this, set the cross-origin attribute of the images you use to
   * 'anonymous'.
   *
   * @returns {string|null}
   */

  getPhoto () {
    return FBInstant.player.getPhoto();
  }



  /**
   * @method player.getDataAsync
   *
   * Retrieve data from the designated cloud storage of the current player.
   *
   * @arg {string[]} keys
   * @returns {Promise<Object>} data
   */

  getDataAsync (keys) {
    return Promise.try(() => {
      return FBInstant.player.getDataAsync(keys);
    });
  }



  /**
   * @method player.setDataAsync
   *
   * Save data to the designated cloud storage of the current player.
   * You can save a maximum of 1MB data for each player.
   *
   * @arg {Object} data
   * @returns {Promise<Object>} data
   */

  setDataAsync (data) {
    return Promise.try(() => {
      return FBInstant.player.setDataAsync(data);
    });
  }



  /**
   * @method player.flushDataAsync
   *
   * Immediately flushes any changes to the player data to the designated cloud
   * storage. This function is expensive, and should primarily be used for
   * critical changes where persistence needs to be immediate and known by the
   * game. Non-critical changes should rely on the platform to persist them
   * in the background. NOTE: Calls to player.setDataAsync will be rejected
   * while this function's result is pending.
   *
   * @returns {Promise}
   */

  flushDataAsync () {
    return Promise.try(() => {
      return FBInstant.player.flushDataAsync();
    });
  }



  /**
   * @method player.getConnectedPlayersAsync
   *
   * Fetches an array of ConnectedPlayer objects containing information about
   * players that are connected to the current player, either as a
   * Facebook friend or as a Messenger contact. Only players who also play
   * the Instant Game are returned.
   *
   * @returns {Promise<Array>} players - a list of player objects
   */

  getConnectedPlayersAsync () {
    return Promise.try(() => {
      return FBInstant.player.getConnectedPlayersAsync();
    });
  }



  /**
   * @method player.getSignedPlayerInfoAsync
   *
   * Fetch the player's unique identifier along with a signature that verifies
   * that the identifier indeed comes from Facebook without being tampered with.
   * This function should not be called until FBInstant.initializeAsync() has
   * resolved.
   *
   * @arg {string} requestPayload - A developer-specified payload to include in
   *   the signed response.
   * @returns {Promise<SignedPlayerInfo>} result - an instance of SignedPlayerInfo
   */

  getSignedPlayerInfoAsync (requestPayload) {
    return Promise.try(() => {
      return FBInstant.player.getSignedPlayerInfoAsync(requestPayload);
    });
  }

};



// Singleton Export
export default new FBInstantPlayerWrapper();
