import Promise from 'bluebird';
import FBInstant from './FBInstant';

/**
 * @class FBInstantPaymentsWrapper
 *
 * FBInstantPaymentsWrapper wraps the FBInstant payments API, FBInstant.payments,
 * updated through FBInstant 4.1, and substitures mock behavior during
 * development in the simulator.
 *
 * Docs: https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant4.1
 */



class FBInstantPaymentsWrapper {

  /**
   * @method payments.getCatalogAsync
   *
   * @returns {Promise<Array<Product>>}
   */

  getCatalogAsync () {
    return Promise.try(() => {
      return FBInstant.payments.getCatalogAsync();
    });
  }

  /**
   * @method payments.purchaseAsync
   * @param {PurchaseConfig} purchaseConfig
   *
   * @returns {Promise<Purchase>}
   */

  purchaseAsync (purchaseConfig) {
    return Promise.try(() => {
      return FBInstant.payments.purchaseAsync(purchaseConfig);
    });
  }

  /**
   * @method payments.getPurchaseAsync
   *
   * @returns {Promise<Array<Purchase>>}
   */
  getPurchasesAsync () {
    return Promise.try(() => {
      return FBInstant.payments.getPurchasesAsync();
    });
  }

  /**
   * @method payments.consumePurchaseAsync
   * @param {String} purchaseToken
   *
   * @returns {Promise<void>}
   */
  consumePurchaseAsync (purchaseToken) {
    return Promise.try(() => {
      return FBInstant.payments.consumePurchaseAsync(purchaseToken);
    });
  }

  /**
   * @method payments.onReady
   * @param {Function} callback
   *
   * @returns {void}
   */

  onReady (callback) {
    return Promise.try(() => {
      return FBInstant.payments.onReady(callback);
    });
  }

  restorePurchasesAsync () {
    return Promise.try(() => {
      FBInstant.payments.restorePurchasesAsync();
    });
  }

};



// Singleton Export
export default new FBInstantPaymentsWrapper();