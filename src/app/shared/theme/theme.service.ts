import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'hf.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.initial());

  constructor() {
    effect(() => {
      const mode = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', mode);
      }
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
      }
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  private initial(): ThemeMode {
    if (typeof localStorage !== 'undefined') {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark') return v;
      } catch {}
    }
    return 'dark';
  }
}
