import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProjectsService } from '../../core/projects/projects.service';
import { Project } from '../../core/models';

/**
 * Component-scoped store. Holds the current project, applies patches from
 * tab components, and debounces saves to Firestore.
 */
@Injectable()
export class EditorStore {
  private readonly svc = inject(ProjectsService);

  private readonly _project = signal<Project | null>(null);
  private readonly _dirty = signal(false);
  private readonly _saving = signal(false);
  private readonly _lastSavedAt = signal<number | null>(null);

  readonly project = this._project.asReadonly();
  readonly dirty = this._dirty.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly lastSavedAt = this._lastSavedAt.asReadonly();
  readonly status = computed(() => {
    if (this._saving()) return 'Saving…';
    if (this._dirty()) return 'Unsaved changes';
    if (this._lastSavedAt()) return 'Saved';
    return '';
  });

  private readonly saveQueue$ = new Subject<void>();

  constructor() {
    this.saveQueue$
      .pipe(debounceTime(900), takeUntilDestroyed())
      .subscribe(() => void this.persist());
  }

  load(project: Project): void {
    this._project.set(project);
    this._dirty.set(false);
    this._lastSavedAt.set(null);
  }

  patch(patch: Partial<Project>): void {
    const current = this._project();
    if (!current) return;
    this._project.set({ ...current, ...patch });
    this._dirty.set(true);
    this.saveQueue$.next();
  }

  async flush(): Promise<void> {
    this.saveQueue$.next();
    if (this._dirty()) {
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    const p = this._project();
    if (!p || !this._dirty()) return;
    this._saving.set(true);
    try {
      // Strip transient fields not stored.
      const { id, orgId, createdAt, updatedAt, createdBy, ...rest } = p;
      await this.svc.update(id, rest as Partial<Project>);
      this._dirty.set(false);
      this._lastSavedAt.set(Date.now());
    } finally {
      this._saving.set(false);
    }
  }
}
