import { Injectable, signal } from '@angular/core';

export type EditorStatus = 'saving' | 'dirty' | 'saved' | 'idle';
export type UnitsSystem = 'us' | 'metric';

const UNITS_KEY = 'hf.units';

/**
 * Root-scoped state that the AppShell observes (breadcrumb, save status,
 * busy indicator) and that the editor + tabs publish into. Keeps the shell
 * decoupled from the component-scoped EditorStore.
 */
@Injectable({ providedIn: 'root' })
export class ShellState {
  readonly breadcrumbTail = signal<string | null>(null);
  readonly editorStatus = signal<EditorStatus>('idle');
  readonly busy = signal(false);
  readonly units = signal<UnitsSystem>(this.initialUnits());

  setBreadcrumb(tail: string | null): void {
    this.breadcrumbTail.set(tail);
  }

  setEditorStatus(s: EditorStatus): void {
    this.editorStatus.set(s);
  }

  setBusy(b: boolean): void {
    this.busy.set(b);
  }

  setUnits(u: UnitsSystem): void {
    this.units.set(u);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(UNITS_KEY, u); } catch {}
    }
  }

  private initialUnits(): UnitsSystem {
    if (typeof localStorage !== 'undefined') {
      try {
        const v = localStorage.getItem(UNITS_KEY);
        if (v === 'us' || v === 'metric') return v;
      } catch {}
    }
    return 'us';
  }
}
