import MockFBInstant from './MockFBInstant';

const USE_MOCK_DATA = process.env.FB_INSTANT_USE_MOCK_DATA === 'true' || false;

let API = MockFBInstant;

if (!USE_MOCK_DATA) {
  if (typeof FBInstant !== 'undefined') {
    API = FBInstant;
  } else {
    throw new Error("FBINSTANT: No window.FBInstant defined!");
  }
}

export default API;