import Promise from 'bluebird';
// TODO: Use jsio-webpack-v1 to build this.  bring back string-hash then.
// import stringHash from 'string-hash';

const LS_KEY = 'devkit-fbinstant:MockFBInstant';
const PLAYER_DATA_PREFIX = 'playerData';

// change the simulated mock behavior
const SIMULATE_LOCALE_TYPE = 'en_US';
const SIMULATE_PLATFORM_TYPE = '';
const SIMULATE_SDK_VERSION = '6.0';
const SIMULATE_CONTEXT_TYPE = 'THREAD';
const SIMULATE_OUTDATED_APP = false;
const SIMULATE_USER_INPUT_CANCEL_ERROR = false;
const SIMULATE_AD_LOAD_TIME = 3000;
const SIMULATE_AD_UNAVAILABLE = false;
const SIMULATE_AD_LOAD_FAILURE = false;
const SIMULATE_AD_WATCH_CANCELLED = false;
const SIMULATE_CONTEXT_SIZE = 5;
const SIMULATE_CAN_PLAYER_MATCH = true;
const SIMULATE_MATCH_WAIT_TIME = 5000;
const SIMULATE_MATCH_FAILED = false;

const SIMULATE_SUPPORTED_APIS = [
  'initializeAsync',
  'getLocale',
  'getPlatform',
  'getSDKVersion',
  'getSupportedAPIs',
  'setLoadingProgress',
  'getEntryPointData',
  'setSessionData',
  'startGameAsync',
  'updateAsync',
  'shareAsync',
  'quit',
  'logEvent',
  'onPause',
  'getInterstitialAdAsync',
  'getRewardedVideoAsync',
  'checkCanPlayerMatchAsync',
  'matchPlayerAsync',
  'switchGameAsync',
  'player.getID',
  'player.getName',
  'player.getPhoto',
  'player.getDataAsync',
  'player.setDataAsync',
  'player.flushDataAsync',
  'player.getConnectedPlayersAsync',
  'player.getSignedPlayerInfoAsync',
  'context.getID',
  'context.getType',
  'context.switchAsync',
  'context.chooseAsync',
  'context.createAsync',
  'context.getPlayersAsync',
  'context.isSizeBetween',
  'payments.getCatalogAsync',
  'payments.purchaseAsync',
  'payments.getPurchasesAsync',
  'payments.consumePurchaseAsync',
  'payments.onReady',
  'payments.restorePurchasesAsync'
];

// simulate real FBInstant getPlatform behavior
const _userAgent = navigator && navigator.userAgent;
const _isIOS = /iPod|iPhone|iPad/i.test(_userAgent);
const _isAndroid = /Android/.test(_userAgent);

// simulate real FBInstant behavior around initializeAsync
let _initialized = false;

// simulate real FBInstant behavior around startGameAsync
let _gameStarted = false;

// simulate state for loading progress
let _loadingProgress = 0;

// simulate session data
let _sessionData = {};

// simulate onPause callback
let _onPauseCallback = null;
const onPause = function () {
  if (window.document && window.document.hidden) {
    _onPauseCallback && _onPauseCallback();
  }
}

window.addEventListener('visibilitychange', onPause, false);



// NOTE: Do not use lambda arrow functions because we rely on 'this' context!

class MockFBInstant {

  constructor () {
    this.player = new MockFBInstantPlayer();
    this.context = new MockFBInstantContext();
    this.payments = new MockFBInstantPayments();
  }

  /**
   * Mock API's
   */

  initializeAsync () {
    console.log("FBINSTANT: mock initializeAsync");

    _initialized = true;
    return Promise.resolve();
  }

  getLocale () {
    if (_initialized) {
      console.log("FBINSTANT: mock getLocale");

      return SIMULATE_LOCALE_TYPE;
    } else {
      console.warn("FBINSTANT: mock getLocale FAILED! \
        You must call initializeAsync first.");

      return null;
    }
  }

  getPlatform () {
    console.log("FBINSTANT: mock getPlatform");

    if (SIMULATE_PLATFORM_TYPE) {
      return SIMULATE_PLATFORM_TYPE;
    } else if (_isIOS) {
      return 'IOS';
    } else if (_isAndroid) {
      return 'ANDROID';
    } else {
      return 'WEB';
    }
  }

  getSDKVersion () {
    console.log("FBINSTANT: mock getSDKVersion");

    return SIMULATE_SDK_VERSION;
  }

  getSupportedAPIs () {
    console.log("FBINSTANT: mock getSupportedAPIs");

    return SIMULATE_SUPPORTED_APIS;
  }

  setLoadingProgress (percent) {
    console.log("FBINSTANT: mock setLoadingProgress, set to " + percent + "%");

    _loadingProgress = percent;
  }

  getEntryPointData () {
    if (_initialized) {
      console.log("FBINSTANT: mock getEntryPointData");
    } else {
      console.warn("FBINSTANT: mock getEntryPointData \
        called before initializeAsync!");
    }

    return {};
  }

  setSessionData (data) {
    if (_initialized) {
      console.log("FBINSTANT: mock setSessionData", data);

      _sessionData = data;
    } else {
      console.warn("FBINSTANT: mock setSessionData \
        called before initializeAsync!");
    }
  }

  startGameAsync () {
    if (_initialized) {
      _gameStarted = true;

      if (SIMULATE_OUTDATED_APP) {
        console.warn("FBINSTANT: mock startGameAsync. \
          Rejecting promise to simulate outdated app.");

        return Promise.reject(new MockCodedError(ERROR_TYPE_CLIENT_REQUIRES_UPDATE));
      } else {
        console.log("FBINSTANT: mock startGameAsync. \
          Resolving promise to simulate up-to-date app.");

        return Promise.resolve();
      }
    } else {
      console.warn("FBINSTANT: mock startGameAsync FAILED!. \
        You must call initializeAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  updateAsync (opts) {
    if (_initialized) {
      console.log("FBINSTANT: mock updateAsync", opts);
    } else {
      console.warn("FBINSTANT: mock updateAsync \
        called before initializeAsync!", opts);
    }

    return Promise.resolve();
  }

  shareAsync (opts) {
    if (_initialized) {
      if (SIMULATE_USER_INPUT_CANCEL_ERROR) {
        console.warn("FBINSTANT: mock shareAsync. \
          Rejecting promise to simulate user cancelled without sharing.");

        return Promise.reject(new MockCodedError(ERROR_TYPE_USER_INPUT));
      } else {
        console.log("FBINSTANT: mock shareAsync", opts);

        return Promise.resolve();
      }
    } else {
      console.warn("FBINSTANT: mock shareAsync \
        called before initializeAsync!", opts);

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  quit () {
    console.log("FBINSTANT: mock quit");
    location.reload();
  }

  logEvent (name, value, opts) {
    if (_initialized) {
      console.log("FBINSTANT: mock logEvent", name, value, opts);
    } else {
      console.warn("FBINSTANT: mock logEvent \
        called before initializeAsync!", name, value, opts);
    }

    return false;
  }

  onPause (fn) {
    console.log("FBINSTANT: mock onPause");

    _onPauseCallback = fn;
  }

  getInterstitialAdAsync (placementID) {
    if (_initialized) {
      console.log("FBINSTANT: mock getInterestialAdAsync");

      if (SIMULATE_AD_UNAVAILABLE) {
        return Promise.reject(new MockCodedError(ERROR_TYPE_ADS_NO_FILL));
      } else {
        return Promise.resolve(new MockFBInstantAdInstance(placementID));
      }
    } else {
      console.warn("FBINSTANT: mock getInterestialAdAsync \
        called before initalizeAsync!");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  getRewardedVideoAsync (placementID) {
    if (_initialized) {
      console.log("FBINSTANT: mock getRewardedVideoAsync");

      if (SIMULATE_AD_UNAVAILABLE) {
        return Promise.reject(new MockCodedError(ERROR_TYPE_ADS_NO_FILL));
      } else {
        return Promise.resolve(new MockFBInstantAdInstance(placementID));
      }
    } else {
      console.warn("FBINSTANT: mock getRewardedVideoAsync \
        called before initalizeAsync!");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  checkCanPlayerMatchAsync () {
    if (_initialized) {
      console.log("FBINSTANT: mock checkCanPlayerMatchAsync");

      return new Promise((resolve, reject) => {
        resolve(SIMULATE_CAN_PLAYER_MATCH);
      });
    } else {
      console.warn("FBINSTANT: mock checkCanPlayerMatchAsync \
        called before initializeAsync!");

      return new Promise((resolve, reject) => {
        reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
      });
    }
  }

  matchPlayerAsync (matchTag) {
    if (_initialized) {
      console.log("FBINSTANT: mock matchPlayerAsync", matchTag);

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (SIMULATE_MATCH_FAILED) {
            reject();
          } else {
            _setLSData('contextID', _getNewID());
            resolve();
          }
        }, SIMULATE_MATCH_WAIT_TIME);
      });
    } else {
      console.warn("FBINSTANT: mock matchPlayerAsync \
        called before initalizeAsync!", matchTag);

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  switchGameAsync (appID, payload) {
    if (_initialized) {
      console.log("FBINSTANT: mock switchGameAsync", appID, payload);
    } else {
      console.warn("FBINSTANT: mock switchGameAsync \
        called before initalizeAsync!", appID, payload);

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

};



/**
 * Mock Player API's
 */

class MockFBInstantPlayer {

  getID () {
    console.log("FBINSTANT: mock player.getID");

    return _getLSData('playerID', _getNewID());
  }

  getName () {
    if (_initialized) {
      console.log("FBINSTANT: mock player.getName");

      const playerID = this.getID();
      return "TestName" + playerID;
    } else {
      console.warn("FBINSTANT: mock player.getName FAILED! \
        You must call initializeAsync first.");

      return null;
    }
  }

  getPhoto () {
    if (_initialized) {
      console.log("FBINSTANT: mock player.getPhoto");

      const playerID = this.getID();
      // TODO: Use stringHash when available
      // const imageID = (stringHash(playerID) % 9 + 1).toString();
      const imageID = '1';
      const imageName = 'animal_000' + imageID + '.png';
      return 'frontend/devkit-fbinstant/images/avatar/' + imageName;
    } else {
      console.warn("FBINSTANT: mock player.getPhoto FAILED! \
        You must call initializeAsync first.");

      return null;
    }
  }

  getDataAsync (keys) {
    if (_initialized) {
      console.log("FBINSTANT: mock player.getDataAsync", keys);

      return Promise.map(keys, (key) => _getLSData(`${PLAYER_DATA_PREFIX}:${key}`))
        .then((values) => {
          const res = {};
          keys.forEach((key, i) => { res[key] = values[i]; });
          return res;
        });
    } else {
      console.warn("FBINSTANT: mock player.getDataAsync FAILED! \
        You must call initializeAsync first.", keys);

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  setDataAsync (data) {
    if (_initialized) {
      console.log("FBINSTANT: mock player.setDataAsync", data);

      return Promise.resolve()
        .then(() => {
          Object.keys(data).forEach((key) => {
            _setLSData(`${PLAYER_DATA_PREFIX}:${key}`, data[key]);
          });
        });
    } else {
      console.warn("FBINSTANT: mock player.setDataAsync FAILED! \
        You must call initializeAsync first.", data);

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  flushDataAsync () {
    if (_initialized) {
      console.log("FBINSTANT: mock player.flushDataAsync");

      return Promise.resolve();
    } else {
      console.warn("FBINSTANT: mock player.flushDataAsync FAILED! \
        You must call initializeAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  getConnectedPlayersAsync () {
    if (_initialized) {
      console.log("FBINSTANT: mock player.getConnectedPlayersAsync");

      // TODO: return an array of instances of MockFBInstantConnectedPlayer
      return Promise.resolve([]);
    } else {
      console.warn("FBINSTANT: mock player.getConnectedPlayersAsync FAILED! \
        You must call initializeAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  getSignedPlayerInfoAsync () {
    if (_initialized) {
      console.log("FBINSTANT: mock player.getSignedPlayerInfoAsync");

      return Promise.resolve(new MockFBInstantSignedPlayerInfo());
    } else {
      console.warn("FBINSTANT: mock player.getSignedPlayerInfoAsync FAILED! \
        You must call initializeAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

};



/**
 * Mock Context API's
 */

class MockFBInstantContext {

  getID () {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.getID");

      return _getLSData('contextID', _getNewID());
    } else {
      console.warn("FBINSTANT: mock context.getID FAILED! \
        You must call startGameAsync first.");

      return null;
    }
  }

  getType () {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.getType");

      return SIMULATE_CONTEXT_TYPE;
    } else {
      console.warn("FBINSTANT: mock context.getType FAILED! \
        You must call startGameAsync first.");

      return null;
    }
  }

  switchAsync (contextID) {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.switchAsync to ", contextID);

      _setLSData('contextID', contextID);
      return Promise.resolve();
    } else {
      console.warn("FBINSTANT: mock context.switchAsync FAILED! \
        You must call startGameAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  chooseAsync (opts) {
    if (_initialized && _gameStarted) {
      if (SIMULATE_USER_INPUT_CANCEL_ERROR) {
        console.warn("FBINSTANT: mock chooseAsync. \
          Rejecting promise to simulate user cancelled without picking a context.");

        return Promise.reject(new MockCodedError(ERROR_TYPE_USER_INPUT));
      } else {
        console.log("FBINSTANT: mock context.chooseAsync", opts);

        _setLSData('contextID', _getNewID());
        return Promise.resolve();
      }
    } else {
      console.warn("FBINSTANT: mock context.chooseAsync FAILED! \
        You must call startGameAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  createAsync (playerID) {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.createAsync with player ", playerID);

      _setLSData('contextID', _getNewID());
      return Promise.resolve();
    } else {
      console.warn("FBINSTANT: mock context.createAsync FAILED! \
        You must call startGameAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  getPlayersAsync () {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.getPlayersAsync");

      // TODO: return an array of instances of MockFBInstantContextPlayer
      return Promise.resolve([]);
    } else {
      console.warn("FBINSTANT: mock context.getPlayersAsync FAILED! \
        You must call startGameAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  isSizeBetween (minSize, maxSize) {
    if (_initialized && _gameStarted) {
      console.log("FBINSTANT: mock context.isSizeBetween");

      // currently, the API only returns a response once per session, and will
      // always by design return that response for the rest of the session
      if (this._hasCalledIsSizeBetween) {
        minSize = this._isSizeBetweenMinSize;
        maxSize = this._isSizeBetweenMaxSize;
      } else {
        this._hasCalledIsSizeBetween = true;
        this._isSizeBetweenMinSize = minSize;
        this._isSizeBetweenMaxSize = maxSize;
      }

      return {
        answer: minSize <= SIMULATE_CONTEXT_SIZE && SIMULATE_CONTEXT_SIZE <= maxSize,
        minSize: minSize,
        maxSize: maxSize
      };
    } else {
      console.warn("FBINSTANT: mock context.isSizeBetween FAILED! \
        You must call startGameAsync first.");

      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

};


class MockFBInstantPayments {

  getCatalogAsync () {
    return Promise.resolve([]);
  }

  purchaseAsync (purchaseConfig) {
    return Promise.resolve({
      productID: purchaseConfig.productID,
      developerPayload: purchaseConfig.developerPayload,
      purchaseToken: 'MOCK_PURCHASE_TOKEN'
    });
  }

  getPurchasesAsync () {
    return Promise.resolve([]);
  }

  consumePurchaseAsync (purchaseID) {
    return Promise.resolve();
  }

  onReady (cb) {
    cb();
  }

  restorePurchasesAsync () {
    return Promise.resolve();
  }

}



/**
 * Mock AdInstance object returned by getRewardedVideoAsync
 */

class MockFBInstantAdInstance {

  constructor (placementID) {
    this.placementID = placementID;
    this._onClickCallback = null;

    // TODO: make a clickable ad view in devkit that stays up for sometime
  }

  getPlacementID () {
    return this.placementID;
  }

  loadAsync () {
    if (!SIMULATE_AD_LOAD_FAILURE) {
      console.log("FBINSTANT: mock adInstance.loadAsync");

      return new Promise((resolve) => {
        setTimeout(resolve, SIMULATE_AD_LOAD_TIME);
      });
    } else {
      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  showAsync () {
    if (!SIMULATE_AD_WATCH_CANCELLED) {
      console.log("FBINSTANT: mock adInstance.showAsync");

      return Promise.resolve();
    } else {
      return Promise.reject(new MockCodedError(ERROR_TYPE_UNKNOWN));
    }
  }

  onClick (callback) {
    this._onClickCallback = callback;
  }

}



/**
 * Mock SignedPlayerInfo object returned by player.getSignedPlayerInfoAsync
 */

class MockFBInstantSignedPlayerInfo {

  getPlayerID () {
    return FBInstant.player.getID();
  }

  getSignature () {
    return process.env.FB_INSTANT_MOCK_SIGNATURE;
  }
}



/**
 * Mock ConnectedPlayer object returned by player.getConnectedPlayersAsync
 */

class MockFBInstantConnectedPlayer {

  getID () {
    throw new Error('TODO');
  }

  getName () {
    throw new Error('TODO');
  }

  getPhoto () {
    throw new Error('TODO');
  }

}



/**
 * Mock ContextPlayer object returned by context.getPlayersAsync
 */

class MockFBInstantContextPlayer {

  getID () {
    throw new Error('TODO');
  }

  getName () {
    throw new Error('TODO');
  }

  getPhoto () {
    throw new Error('TODO');
  }

}



/**
 * Mock FBInstant CodedError
 */

// mock coded error types
const ERROR_TYPE_ADS_NO_FILL = 'ADS_NO_FILL';
const ERROR_TYPE_ADS_FREQUENT_LOAD = 'ADS_FREQUENT_LOAD';
const ERROR_TYPE_ANALYTICS_POST_EXCEPTION = 'ANALYTICS_POST_EXCEPTION';
const ERROR_TYPE_CLIENT_REQUIRES_UPDATE = 'CLIENT_REQUIRES_UPDATE';
const ERROR_TYPE_INVALID_PARAM = 'INVALID_PARAM';
const ERROR_TYPE_NETWORK_FAILURE = 'NETWORK_FAILURE';
const ERROR_TYPE_PENDING_REQUEST = 'PENDING_REQUEST';
const ERROR_TYPE_UNKNOWN = 'UNKNOWN';
const ERROR_TYPE_USER_INPUT = 'USER_INPUT';

// mock coded error messages
const ERROR_MESSAGES = {};

ERROR_MESSAGES[ERROR_TYPE_ADS_NO_FILL] = "MOCK ERROR MESSAGE: \
  We were not able to serve ads to the current user. \
  This can happen if the user has opted out of interest-based ads on their device, or if we do not have ad inventory to show for that user.";

ERROR_MESSAGES[ERROR_TYPE_ADS_FREQUENT_LOAD] = "MOCK ERROR MESSAGE: \
  Ads are being loaded too frequently.";

ERROR_MESSAGES[ERROR_TYPE_ANALYTICS_POST_EXCEPTION] = "MOCK ERROR MESSAGE: \
  The analytics API experienced a problem while attempting to post an event.";

ERROR_MESSAGES[ERROR_TYPE_CLIENT_REQUIRES_UPDATE] = "MOCK ERROR MESSAGE: \
  The client requires an update to access the feature that returned this result. \
  If this result is returned on web, it means the feature is not supported by the web client yet.";

ERROR_MESSAGES[ERROR_TYPE_INVALID_PARAM] = "MOCK ERROR MESSAGE: \
  The parameter(s) passed to the API are invalid. \
  Could indicate an incorrect type, invalid number of arguments, or a semantic issue (for example, passing an unserializable object to a serializing function).";

ERROR_MESSAGES[ERROR_TYPE_NETWORK_FAILURE] = "MOCK ERROR MESSAGE: \
  The client experienced an issue with a network request. \
  This is likely due to a transient issue, such as the player's internet connection dropping.";

ERROR_MESSAGES[ERROR_TYPE_PENDING_REQUEST] = "MOCK ERROR MESSAGE: \
  Represents a rejection due an existing request that conflicts with this one. \
  For example, we will reject any calls that would surface a Facebook UI when another request that depends on a Facebook UI is pending.";

ERROR_MESSAGES[ERROR_TYPE_UNKNOWN] = "MOCK ERROR MESSAGE: \
  An unknown or unspecified issue occurred. \
  This is the default error code returned when the client does not specify a code.";

ERROR_MESSAGES[ERROR_TYPE_USER_INPUT] = "MOCK ERROR MESSAGE: \
  The user made a choice that resulted in a rejection. \
  For example, if the game calls up the Context Switch dialog and the player closes it, this error code will be included in the promise rejection.";



class MockCodedError {

  constructor (code) {
    this.code = code || ERROR_TYPE_UNKNOWN;
    this.message = ERROR_MESSAGES[this.code];
  }

}


export default new MockFBInstant();



/**
 * Mock Data Helpers
 */

const _getNewID = () => {
  return Math.floor(1000 + Math.random() * 10000).toString();
};

const _getLSData = (key, defaultValue) => {
  try {
    const value = localStorage.getItem(LS_KEY + ':' + key);
    console.log("FBINSTANT: mock getDataAsync \
      (" + key + ", " + defaultValue + "): " + value);

    if (value) {
      return JSON.parse(value);
    }

    _setLSData(key, defaultValue);
  } catch (e) {
    console.error("FBINSTANT: mock getDataAsync FAILED!", e);
  }

  return defaultValue;
};

const _setLSData = (key, value) => {
  try {
    console.log("FBINSTANT: mock setDataAsync " + key + ": " + value);

    if (!value) {
      localStorage.removeItem(value);
    } else {
      localStorage.setItem(LS_KEY + ':' + key, JSON.stringify(value));
    }
  } catch (e) {
    console.error("FBINSTANT: mock setDataAsync FAILED!", e);
  }
};
