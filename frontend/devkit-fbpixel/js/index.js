const pixelLoaded = typeof window.fbq !== 'undefined';

class FacebookPixelWrapper {
  track (name, params) {
    if (!pixelLoaded) {
      return;
    }

    window.fbq('track', name, params);
  }

  trackCustom (name, params) {
    if (!pixelLoaded) {
      return;
    }

    window.fbq('trackCustom', name, params);
  }

  get enabled () {
    return pixelLoaded;
  }
}

export default new FacebookPixelWrapper();