import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';

import { environment } from '../../../environments/environment';
import { Organization, UserProfile } from '../models';

const LOCAL_UID = 'local-dev-user';
const LOCAL_ORG_ID = 'local-dev-org';

const LOCAL_USER = {
  uid: LOCAL_UID,
  email: 'local@hilli-fire.dev',
  displayName: 'Local Dev',
} as unknown as User;

const LOCAL_PROFILE: UserProfile = {
  uid: LOCAL_UID,
  email: 'local@hilli-fire.dev',
  displayName: 'Local Dev',
  orgId: LOCAL_ORG_ID,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth, { optional: true });
  private readonly firestore = inject(Firestore, { optional: true });

  private readonly _user = signal<User | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);
  private readonly _ready = signal(false);

  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly orgId = computed(() => this._profile()?.orgId ?? null);

  constructor() {
    if (environment.localMode || !this.auth) {
      this._user.set(LOCAL_USER);
      this._profile.set(LOCAL_PROFILE);
      this._ready.set(true);
      return;
    }

    onAuthStateChanged(this.auth, async (user) => {
      this._user.set(user);
      if (user) {
        await this.loadProfile(user);
      } else {
        this._profile.set(null);
      }
      this._ready.set(true);
    });
  }

  async loginWithGoogle(): Promise<void> {
    if (environment.localMode || !this.auth || !this.firestore) {
      // Local mode: already "signed in" — nothing to do.
      return;
    }
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    // First-time Google sign-in: bootstrap an organization for them.
    const profileRef = doc(this.firestore, `userProfiles/${cred.user.uid}`);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await this.bootstrapOrganization(
        cred.user.uid,
        cred.user.email ?? '',
        cred.user.displayName ?? '',
        `${cred.user.displayName ?? cred.user.email}'s Organization`,
      );
      await this.loadProfile(cred.user);
    }
  }

  async logout(): Promise<void> {
    if (environment.localMode || !this.auth) {
      // No-op in local mode.
      return;
    }
    await signOut(this.auth);
  }

  private async bootstrapOrganization(
    uid: string,
    email: string,
    displayName: string,
    orgName: string,
  ): Promise<void> {
    if (!this.firestore) return;
    const orgId = uid;
    const orgRef = doc(this.firestore, `organizations/${orgId}`);
    const org: Organization = {
      id: orgId,
      name: orgName,
      ownerUid: uid,
      createdAt: Date.now(),
    };
    await setDoc(orgRef, { ...org, createdAt: serverTimestamp() });

    const memberRef = doc(this.firestore, `organizations/${orgId}/members/${uid}`);
    await setDoc(memberRef, {
      uid,
      email,
      displayName: displayName || null,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });

    const profileRef = doc(this.firestore, `userProfiles/${uid}`);
    await setDoc(profileRef, {
      uid,
      email,
      displayName: displayName || null,
      orgId,
    });
  }

  private async loadProfile(user: User): Promise<void> {
    if (!this.firestore) return;
    const profileRef = doc(this.firestore, `userProfiles/${user.uid}`);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      this._profile.set(snap.data() as UserProfile);
    } else {
      this._profile.set(null);
    }
  }
}
