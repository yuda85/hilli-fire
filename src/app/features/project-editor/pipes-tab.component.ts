import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { EditorStore } from './editor-store';
import { PipeMaterialKey, ProjectPipe } from '../../core/models';

const MATERIALS: { value: PipeMaterialKey; label: string }[] = [
  { value: 'schd-10-steel-dry', label: 'SCHD 10 STEEL, DRY' },
  { value: 'sched-10-wet-steel', label: 'SCHED 10 WET STEEL' },
  { value: 'schd-40-steel-wet', label: 'SCHD 40 STEEL, WET' },
  { value: 'schd-40-steel-dry', label: 'SCHD 40 STEEL, DRY' },
  { value: 'cpvc', label: 'CPVC' },
  { value: 'copper-type-l', label: 'COPPER TYPE L' },
];

@Component({
  selector: 'app-pipes-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="pipes-tab">
      <div class="toolbar">
        <div class="toolbar__title">
          <h3>Pipe Input</h3>
          <p class="muted">Pipe segments connecting nodes in the network.</p>
        </div>
        <span class="spacer"></span>
        <button class="ghost-btn" (click)="addPipe()">
          <span class="material-symbols-outlined">add</span>
          Add pipe
        </button>
      </div>

      <form [formGroup]="form">
        <table mat-table [dataSource]="rows()" formArrayName="pipes" class="full-width">
          <ng-container matColumnDef="begNode">
            <th mat-header-cell *matHeaderCellDef>Beg. Node</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" formControlName="begNode" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="endNode">
            <th mat-header-cell *matHeaderCellDef>End. Node</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" formControlName="endNode" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="material">
            <th mat-header-cell *matHeaderCellDef>Material</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select formControlName="materialKey">
                  @for (m of materials; track m.value) {
                    <mat-option [value]="m.value">{{ m.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="nominalDiameterIn">
            <th mat-header-cell *matHeaderCellDef>Nom. Dia. (in)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.5" formControlName="nominalDiameterIn" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="typeGroup">
            <th mat-header-cell *matHeaderCellDef>Type Group</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" formControlName="typeGroup" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="fittingCode">
            <th mat-header-cell *matHeaderCellDef>Fitting</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput formControlName="fittingCode" placeholder="E / 2E / 6E / BC" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="fittingDataLengthFt">
            <th mat-header-cell *matHeaderCellDef>Fitting Data (ft)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.1" formControlName="fittingDataLengthFt" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="nominalLengthFt">
            <th mat-header-cell *matHeaderCellDef>Nom. Length (ft)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.1" formControlName="nominalLengthFt" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row; let i = index">
              <button mat-icon-button color="warn" (click)="remove(i)" aria-label="Delete row">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </form>

      @if (rows().length === 0) {
        <div class="empty">
          <span class="material-symbols-outlined">linear_scale</span>
          <p>No pipes yet. Add a pipe above.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .pipes-tab { padding: 24px; }
      .toolbar {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        margin-bottom: 16px;
      }
      .toolbar__title h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--hf-text);
      }
      .toolbar__title .muted {
        margin: 2px 0 0;
        color: var(--hf-text-muted);
        font-size: 12px;
      }
      .ghost-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        background: transparent;
        border: 1px dashed var(--hf-border-strong);
        color: var(--hf-text-muted);
        border-radius: var(--hf-radius-sm);
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--hf-dur) var(--hf-ease),
                    color var(--hf-dur) var(--hf-ease),
                    border-color var(--hf-dur) var(--hf-ease);
      }
      .ghost-btn .material-symbols-outlined { font-size: 16px; }
      .ghost-btn:hover {
        color: var(--hf-text);
        border-color: var(--hf-primary);
        border-style: solid;
        background: var(--hf-primary-soft);
      }
      .narrow { max-width: 110px; }
      .empty {
        padding: 48px 24px;
        text-align: center;
        color: var(--hf-text-muted);
        border: 1px dashed var(--hf-border);
        border-radius: var(--hf-radius);
        background: var(--hf-surface-2);
      }
      .empty .material-symbols-outlined {
        font-size: 32px;
        color: var(--hf-text-faint);
        margin-bottom: 8px;
      }
      .empty p { margin: 0; font-size: 13px; }
      mat-form-field { width: 100%; }
      ::ng-deep table.mat-mdc-table { background: transparent; }
      ::ng-deep th.mat-mdc-header-cell {
        background: var(--hf-surface-2) !important;
        color: var(--hf-text-muted);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-bottom: 1px solid var(--hf-border-strong);
      }
      ::ng-deep td.mat-mdc-cell {
        padding: 4px 8px !important;
        border-bottom: 1px solid var(--hf-border);
      }
      ::ng-deep tr.mat-mdc-row:hover { background: var(--hf-surface-2); }
    `,
  ],
})
export class PipesTabComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EditorStore);
  readonly materials = MATERIALS;

  readonly cols = [
    'begNode',
    'endNode',
    'material',
    'nominalDiameterIn',
    'typeGroup',
    'fittingCode',
    'fittingDataLengthFt',
    'nominalLengthFt',
    'actions',
  ];

  readonly form = this.fb.nonNullable.group({
    pipes: this.fb.array<FormGroup>([]),
  });

  private loadedProjectId: string | null = null;

  get pipesArray(): FormArray<FormGroup> {
    return this.form.controls.pipes;
  }

  rows(): FormGroup[] {
    return this.pipesArray.controls;
  }

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (!p || p.id === this.loadedProjectId) return;
      this.loadedProjectId = p.id;
      this.pipesArray.clear({ emitEvent: false });
      for (const pipe of p.pipes) {
        this.pipesArray.push(this.makeRow(pipe), { emitEvent: false });
      }
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.store.project()) return;
      const pipes: ProjectPipe[] = this.pipesArray.controls.map((g) => {
        const v = g.getRawValue();
        return {
          begNode: Number(v.begNode),
          endNode: Number(v.endNode),
          materialKey: v.materialKey as PipeMaterialKey,
          nominalDiameterIn: Number(v.nominalDiameterIn),
          typeGroup: v.typeGroup != null ? Number(v.typeGroup) : undefined,
          fittingCode: v.fittingCode || undefined,
          fittingDataLengthFt: v.fittingDataLengthFt != null ? Number(v.fittingDataLengthFt) : undefined,
          nominalLengthFt: Number(v.nominalLengthFt),
        };
      });
      this.store.patch({ pipes });
    });
  }

  addPipe(): void {
    const project = this.store.project();
    this.pipesArray.push(
      this.makeRow({
        begNode: 0,
        endNode: 0,
        materialKey: project?.defaultPipeMaterial ?? 'schd-10-steel-dry',
        nominalDiameterIn: 1.5,
        typeGroup: 0,
        nominalLengthFt: 0,
      }),
    );
  }

  remove(idx: number): void {
    this.pipesArray.removeAt(idx);
  }

  private makeRow(p: ProjectPipe): FormGroup {
    return this.fb.nonNullable.group({
      begNode: [p.begNode, [Validators.required]],
      endNode: [p.endNode, [Validators.required]],
      materialKey: [p.materialKey as PipeMaterialKey],
      nominalDiameterIn: [p.nominalDiameterIn],
      typeGroup: [p.typeGroup ?? 0],
      fittingCode: [p.fittingCode ?? ''],
      fittingDataLengthFt: [p.fittingDataLengthFt ?? null],
      nominalLengthFt: [p.nominalLengthFt],
    });
  }
}
