// GitHub Pages build environment.
//
// localMode: true means the deployed demo runs entirely client-side —
// no Firebase project required. Auth is auto-signed-in as a local user,
// projects persist to localStorage in the visitor's browser.
//
// To wire a real Firebase project into the GH Pages build instead:
//   1. Flip localMode to false
//   2. Replace the REPLACE_ME values with your Firebase web app config
//      (or generate this file from GitHub Actions secrets at build time)
export const environment = {
  production: true,
  localMode: true,
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
  useEmulators: false,
};
