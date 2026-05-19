// Replace these placeholders with your Firebase project's actual config.
// Find them in Firebase Console > Project settings > Your apps > SDK setup and configuration.
//
// LOCAL MODE: when `localMode: true`, the app skips Firebase entirely. Auth is
// auto-signed-in as a fake local user, projects persist to localStorage. Use
// this to run the UI and debug the calculation engine without any Firebase
// config or network access.
export const environment = {
  production: false,
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
