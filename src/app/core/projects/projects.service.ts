import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Project } from '../models';

const LOCAL_STORAGE_KEY = 'hilli-fire:projects';

const EMPTY_PROJECT_DEFAULTS = (): Omit<Project, 'id' | 'orgId' | 'createdAt' | 'updatedAt' | 'createdBy'> => ({
  title: 'New Project',
  designedBy: '',
  date: new Date().toISOString().slice(0, 10),
  client: { name: '', address: '', city: '', phone: '' },
  hazardClass: 'ord-1',
  designAreaFt2: 1500,
  maxAreaPerSprinklerFt2: 130,
  defaultKFactor: 5.6,
  defaultPipeMaterial: 'schd-10-steel-dry',
  hoseStream: { insideGpm: 0, outsideGpm: 0, inRackGpm: 0 },
  waterSupply: {
    source: '',
    hydrantId: '',
    testDate: '',
    hydrantElevFt: 0,
    staticPsi: 0,
    testFlowGpm: 0,
    testResidualPsi: 0,
  },
  calc: {
    mode: 'demand',
    hmdMinResidualPsi: 7,
    minDesiredDensityGpmFt2: 0.15,
  },
  nodes: [],
  pipes: [],
  pumpCurve: [],
  displayUnits: 'us',
});

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly auth = inject(AuthService);

  private readonly local = environment.localMode || !this.firestore;

  private readonly _projects = signal<Project[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasProjects = computed(() => this._projects().length > 0);

  async refresh(): Promise<void> {
    const orgId = this.auth.orgId();
    if (!orgId) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      if (this.local) {
        const all = this.readLocal();
        const projects = all
          .filter((p) => p.orgId === orgId)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        this._projects.set(projects);
        return;
      }
      const col = collection(this.firestore!, `organizations/${orgId}/projects`);
      const snap = await getDocs(query(col, orderBy('updatedAt', 'desc')));
      const projects = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
      this._projects.set(projects);
    } catch (e) {
      this._error.set((e as Error).message);
    } finally {
      this._loading.set(false);
    }
  }

  async create(title: string): Promise<string> {
    const orgId = this.auth.orgId();
    const uid = this.auth.user()?.uid;
    if (!orgId || !uid) throw new Error('Not signed in');

    if (this.local) {
      const now = Date.now();
      const id = `local-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const project: Project = {
        ...EMPTY_PROJECT_DEFAULTS(),
        id,
        orgId,
        title,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
      };
      const all = this.readLocal();
      all.push(project);
      this.writeLocal(all);
      await this.refresh();
      return id;
    }

    const col = collection(this.firestore!, `organizations/${orgId}/projects`);
    const data = {
      ...EMPTY_PROJECT_DEFAULTS(),
      title,
      orgId,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(col, data);
    await this.refresh();
    return ref.id;
  }

  async load(id: string): Promise<Project | null> {
    const orgId = this.auth.orgId();
    if (!orgId) return null;

    if (this.local) {
      return this.readLocal().find((p) => p.id === id && p.orgId === orgId) ?? null;
    }

    const ref = doc(this.firestore!, `organizations/${orgId}/projects/${id}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Project, 'id'>) };
  }

  async update(id: string, patch: Partial<Project>): Promise<void> {
    const orgId = this.auth.orgId();
    if (!orgId) throw new Error('Not signed in');

    if (this.local) {
      const all = this.readLocal();
      const idx = all.findIndex((p) => p.id === id && p.orgId === orgId);
      if (idx < 0) throw new Error('Project not found');
      all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
      this.writeLocal(all);
      return;
    }

    const ref = doc(this.firestore!, `organizations/${orgId}/projects/${id}`);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() } as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const orgId = this.auth.orgId();
    if (!orgId) throw new Error('Not signed in');

    if (this.local) {
      const all = this.readLocal().filter((p) => !(p.id === id && p.orgId === orgId));
      this.writeLocal(all);
      await this.refresh();
      return;
    }

    const ref = doc(this.firestore!, `organizations/${orgId}/projects/${id}`);
    await deleteDoc(ref);
    await this.refresh();
  }

  private readLocal(): Project[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Project[]) : [];
    } catch {
      return [];
    }
  }

  private writeLocal(projects: Project[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  }
}
