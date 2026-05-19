import {
  ApplicationConfig,
  EnvironmentProviders,
  Provider,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import {
  getFirestore,
  provideFirestore,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const firebaseProviders: (Provider | EnvironmentProviders)[] = environment.localMode
  ? []
  : [
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideAuth(() => {
        const auth = getAuth();
        if (environment.useEmulators) {
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        }
        return auth;
      }),
      provideFirestore(() => {
        const firestore = getFirestore();
        if (environment.useEmulators) {
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
        }
        return firestore;
      }),
    ];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(),
    ...firebaseProviders,
  ],
};
