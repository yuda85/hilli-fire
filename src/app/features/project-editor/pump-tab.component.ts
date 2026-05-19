import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';

import { EditorStore } from './editor-store';
import { PumpCurvePoint } from '../../core/models';

/** Elite reports up to 5 pump-curve points; we mirror that. */
const SLOTS = [0, 1, 2, 3, 4] as const;

@Component({
  selector: 'app-pump-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
  ],
  template: `
    <form [formGroup]="form" class="pump-tab">
      <header class="head">
        <h3>Pump Curve</h3>
        <p class="muted">Up to 5 (flow, pressure) points. Leave a row at 0 / 0 if unused.</p>
      </header>

      <div class="grid">
        @for (i of slots; track i) {
          <div class="row">
            <span class="row__label">
              <span class="row__num">{{ i + 1 }}</span>
              Point
            </span>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Flow (gpm)</mat-label>
              <input matInput type="number" step="0.01" class="hf-num" [formControlName]="'flow' + i" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Pressure (psi)</mat-label>
              <input matInput type="number" step="0.01" class="hf-num" [formControlName]="'pressure' + i" />
            </mat-form-field>
          </div>
        }
      </div>
    </form>
  `,
  styles: [
    `
      :host { display: block; }
      .pump-tab { padding: 24px; max-width: 720px; }
      .head { margin-bottom: 20px; }
      .head h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--hf-text);
      }
      .head .muted {
        margin: 2px 0 0;
        color: var(--hf-text-muted);
        font-size: 12px;
      }
      .grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .row {
        display: grid;
        grid-template-columns: 110px 1fr 1fr;
        gap: 12px;
        align-items: center;
      }
      .row__label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--hf-text-muted);
        font-size: 12px;
        font-weight: 500;
      }
      .row__num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: var(--hf-surface-2);
        color: var(--hf-text);
        font-family: var(--hf-font-num);
        font-size: 11px;
        font-weight: 600;
      }
      mat-form-field { width: 100%; }
    `,
  ],
})
export class PumpTabComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EditorStore);
  readonly slots = SLOTS;

  readonly form = this.fb.nonNullable.group({
    flow0: [0], pressure0: [0],
    flow1: [0], pressure1: [0],
    flow2: [0], pressure2: [0],
    flow3: [0], pressure3: [0],
    flow4: [0], pressure4: [0],
  });

  private loadedProjectId: string | null = null;

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (!p || p.id === this.loadedProjectId) return;
      this.loadedProjectId = p.id;
      const patch: Record<string, number> = {};
      for (const i of SLOTS) {
        const pt = p.pumpCurve[i];
        patch[`flow${i}`] = pt?.flowGpm ?? 0;
        patch[`pressure${i}`] = pt?.pressurePsi ?? 0;
      }
      this.form.patchValue(patch, { emitEvent: false });
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.store.project()) return;
      const v = this.form.getRawValue() as Record<string, number>;
      const pumpCurve: PumpCurvePoint[] = SLOTS.map((i) => ({
        flowGpm: Number(v[`flow${i}`]) || 0,
        pressurePsi: Number(v[`pressure${i}`]) || 0,
      }));
      this.store.patch({ pumpCurve });
    });
  }
}
