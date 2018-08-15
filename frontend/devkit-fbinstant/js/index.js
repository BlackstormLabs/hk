import Promise from 'bluebird';
import FBInstant from './FBInstant';
import FBInstantPlayerWrapper from './player';
import FBInstantContextWrapper from './context';
import FBInstantPaymentsWrapper from './payments';

/**
 * @class FBInstantWrapper
 *
 * FBInstantWrapper wraps the top-Level FBInstant API,
 * updated through FBInstant 6.0, and substitures mock behavior during
 * development in the simulator.
 *
 * Docs: https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant6.0
 */



class FBInstantWrapper {

  constructor () {
    this.player = FBInstantPlayerWrapper;
    this.context = FBInstantContextWrapper;
    this.payments = FBInstantPaymentsWrapper;
  }



  /**
   * @method initializeAsync
   *
   * Initializes the SDK library. This should be called before any other
   * SDK functions.
   *
   * @returns {Promise}
   */

  initializeAsync () {
    return Promise.try(() => {
      return FBInstant.initializeAsync();
    });
  }



  /**
   * @method getLocale
   *
   * The current locale.
   * See https://www.facebook.com/translations/FacebookLocales.xml for a
   * complete list of supported locale values. Use this to determine what language
   * the current game should be localized with. The value will always be null
   * until FBInstant.initializeAsync() resolves.
   *
   * @returns {string|null}
   */

  getLocale () {
    return FBInstant.getLocale();
  }



  /**
   * @method getPlatform
   *
   * The platform on which the game is currently running. Possible values are:
   * 'IOS', 'ANDROID' and 'WEB'. The value will always be null until
   * FBInstant.initializeAsync() resolves.
   *
   * @returns {string|null}
   */

  getPlatform () {
    return FBInstant.getPlatform();
  }



  /**
   * @method getSDKVersion
   *
   * A string indicating the version of the SDK.
   *
   * @returns {string}
   */

  getSDKVersion () {
    return FBInstant.getSDKVersion();
  }



  /**
   * @method getSupportedAPIs
   *
   * Provides a list of API functions that are supported by the client.
   *
   * @returns {string[]}
   */

  getSupportedAPIs () {
    return FBInstant.getSupportedAPIs();
  }



  /**
   * @method setLoadingProgress
   *
   * Report the progress of initial resource loading.
   *
   * @arg {number} percent - A percentange in the range [0, 100]
   */

  setLoadingProgress (percent) {
    FBInstant.setLoadingProgress(percent);
  }



  /**
   * @method getEntryPointData
   *
   * Returns the data associated with the entry point that the game was
   * launched from. The contents of the object are developer-defined, and can
   * occur from entry points on different platforms. This will return null for
   * older mobile clients, as well as when there is no data associated with the
   * particular entry point.
   *
   * @returns {Object}
   */

  getEntryPointData () {
    return FBInstant.getEntryPointData();
  }



  /**
   * @method setSessionData
   *
   * Sets the data associated with the individual gameplay session for the
   * current context.
   *
   * This function should be called whenever the game would like to update the
   * current session data. This session data may be used to populate a variety
   * of payloads and entry points, such as game play webhooks.
   *
   * @arg {Object} data - An arbitrary data object, which must be less than or
   *   equal to 1000 characters when stringified.
   */

  setSessionData (data) {
    FBInstant.setSessionData(data);
  }



  /**
   * @method startGameAsync
   *
   * This indicates the game has finished loading resources and is ready to start.
   * FBInstant.context.getID() will be set to its expected value after the
   * returned promise resolves.
   *
   * NOTE: This promise may be rejected if the player has an out-of-date app.
   * Be prepared to catch these rejections, and either force upgrade or allow
   * play through as desired.
   *
   * @returns {Promise}
   */

  startGameAsync () {
    return Promise.try(() => {
      return FBInstant.startGameAsync();
    });
  }



  /**
   * @method updateAsync
   *
   * Informs Facebook of an update that occurred in the game. This will
   * temporarily yield control to Facebook and Facebook will decide what to do
   * based on what the update is. The returned promise will resolve when Facebook
   * gives control back to the game.
   *
   * @arg {Object} opts - See CustomUpdatePayload in the docs linked at the top.
   * @returns {Promise}
   */

  updateAsync (opts) {
    return Promise.try(() => {
      return FBInstant.updateAsync(opts);
    });
  }



  /**
   * @method shareAsync
   *
   * This invokes a dialog to let the user share specified content either as a
   * message in Messenger or as a post on the user's timeline. A blob of data can
   * be attached to the share so that every game session launched from the share
   * will be able to access the same data blob through
   * FBInstant.getEntryPointData(). This data must be less than or equal to
   * 1000 characters when stringified. The user may choose to cancel the share
   * action and close the dialog, and the returned promise will resolve when the
   * dialog is closed regardless if the user actually shared the content or not.
   *
   * @arg {Object} opts - See SharePayload in the docs linked at top.
   * @returns {Promise}
   */

  shareAsync (opts) {
    return Promise.try(() => {
      return FBInstant.shareAsync(opts);
    });
  }



  /**
   * @method quit
   *
   * Quits the game.
   */

  quit () {
    FBInstant.quit();
  }



  /**
   * @method logEvent
   *
   * Log an app event with FB Analytics.
   * See https://developers.facebook.com/docs/javascript/reference/v2.8#app_events
   * for more details about FB Analytics.
   *
   * @arg {string} name - Name of the event. Must be 2 to 40 characters, and
   *   can only contain '_', '-', ' ', and alphanumeric characters.
   * @arg {number} value - An optional numeric value that FB Analytics can
   *   calculate a sum with.
   * @arg {Object} opts - An optional object that can contain up to 25 key-value
   *   pairs to be logged with the event. Keys must be 2 to 40 characters, and
   *   can only contain '_', '-', ' ', and alphanumeric characters. Values must
   *   be less than 100 characters in length.
   * @returns {boolean} whether or not the log was successful
   */

  logEvent (name, value, opts) {
    return FBInstant.logEvent(name, value, opts);
  }



  /**
   * @method onPause
   *
   * Set a callback to be fired when a pause event is triggered.
   */

  onPause (fn) {
    FBInstant.onPause(fn);
  }



  /**
   * @method getInterstitialAdAsync
   *
   * Attempt to create an instance of interstitial ad. This instance can then
   * be preloaded and presented.
   *
   * @arg {string} placementID - The placement ID that's been setup in your
   *   Audience Network settings.
   * @returns {Promise} A promise that resolves with a #adinstance, or rejects
   *   with a #codederror if it couldn't be created.
   */

  getInterstitialAdAsync (placementID) {
    return Promise.try(() => {
      return FBInstant.getInterstitialAdAsync(placementID);
    });
  }



  /**
   * @method getRewardedVideoAysnc
   *
   * Attempt to create an instance of rewarded video. This instance can then be
   * preloaded and presented.
   *
   * @arg {string} placementID - The placement ID that's been setup in your
   *   Audience Network settings.
   * @returns {Promise} A promise that resolves with a #adinstance, or rejects
   *   with a #codederror if it couldn't be created.
   */

  getRewardedVideoAsync (placementID) {
    return Promise.try(() => {
      return FBInstant.getRewardedVideoAsync(placementID);
    });
  }



  /**
   * @method checkCanPlayerMatchAsync
   *
   * Returns a {Promise} that resolves with a boolean on whether the player can
   * be matched by FB policy. This should be called every time before showing
   * the match making in-game UI
   *
   * @returns {Promise} A promise that resolves with a boolean, or rejects
   *   with a #codederror if it couldn't be created.
   */

  checkCanPlayerMatchAsync () {
    return Promise.try(() => {
      return FBInstant.checkCanPlayerMatchAsync();
    });
  }



  /**
   * @method matchPlayerAsync
   *
   * Takes an arbitrary string matchTag as a param. FB will only match players
   * with the same matchTag together.
   *
   * @arg {string} matchTag
   *   NOTE: matchTag must only include letters, numbers and underscores
   *   NOTE: matchTag must be 100 characters or less
   * @returns {Promise}
   */

  matchPlayerAsync (matchTag) {
    return Promise.try(() => {
      return FBInstant.matchPlayerAsync(matchTag);
    });
  }

  /**
   * @method switchGameAsync
   *
   * Request that the client switch to a different Instant Game. The API will
   * reject if the switch fails - else, the client will load the new game.
   *
   * NOTE: This Promise NEVER resolves; in production the game session closes
   *
   * @arg {string} appID
   * @arg {Object} payload
   *
   * @returns {Promise}
   */

  switchGameAsync (appID, payload) {
    return Promise.try(() => {
      return FBInstant.switchGameAsync(appID, payload);
    });
  }

};



// Singleton Export
export default new FBInstantWrapper();