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
import { NodeKind, ProjectNode } from '../../core/models';

@Component({
  selector: 'app-nodes-tab',
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
    <div class="nodes-tab">
      <div class="toolbar">
        <div class="toolbar__title">
          <h3>Node Input</h3>
          <p class="muted">Sprinkler and non-discharge nodes for the network.</p>
        </div>
        <span class="spacer"></span>
        <button class="ghost-btn" (click)="addNode('sprinkler')">
          <span class="material-symbols-outlined">add</span>
          Sprinkler
        </button>
        <button class="ghost-btn" (click)="addNode('no-discharge')">
          <span class="material-symbols-outlined">add</span>
          No-discharge
        </button>
      </div>

      <form [formGroup]="form">
        <table mat-table [dataSource]="rows()" formArrayName="nodes" class="full-width">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Node No.</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" formControlName="id" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select formControlName="description">
                  <mat-option value="sprinkler">Sprinkler</mat-option>
                  <mat-option value="no-discharge">No Discharge</mat-option>
                </mat-select>
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="kFactor">
            <th mat-header-cell *matHeaderCellDef>K-Factor</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.01" formControlName="kFactor" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="elevationFt">
            <th mat-header-cell *matHeaderCellDef>Elevation (ft)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.01" formControlName="elevationFt" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="pressureEstimatePsi">
            <th mat-header-cell *matHeaderCellDef>Pressure Estimate (psi)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.01" formControlName="pressureEstimatePsi" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="areaGroup">
            <th mat-header-cell *matHeaderCellDef>Area Group</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <input matInput formControlName="areaGroup" />
              </mat-form-field>
            </td>
          </ng-container>

          <ng-container matColumnDef="nonSprinklerFlowGpm">
            <th mat-header-cell *matHeaderCellDef>Non-Sprinkler Flow (gpm)</th>
            <td mat-cell *matCellDef="let row; let i = index" [formGroupName]="i">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="narrow">
                <input matInput type="number" step="0.01" formControlName="nonSprinklerFlowGpm" />
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
          <span class="material-symbols-outlined">grid_view</span>
          <p>No nodes yet. Add a sprinkler or no-discharge node above.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .nodes-tab {
        padding: 24px;
      }
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
      table { background: transparent; }
      ::ng-deep table.mat-mdc-table {
        background: transparent;
      }
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
export class NodesTabComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EditorStore);

  readonly cols = [
    'id',
    'description',
    'kFactor',
    'elevationFt',
    'pressureEstimatePsi',
    'areaGroup',
    'nonSprinklerFlowGpm',
    'actions',
  ];

  readonly form = this.fb.nonNullable.group({
    nodes: this.fb.array<FormGroup>([]),
  });

  private loadedProjectId: string | null = null;

  get nodesArray(): FormArray<FormGroup> {
    return this.form.controls.nodes;
  }

  rows(): FormGroup[] {
    return this.nodesArray.controls;
  }

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (!p || p.id === this.loadedProjectId) return;
      this.loadedProjectId = p.id;
      this.nodesArray.clear({ emitEvent: false });
      for (const n of p.nodes) {
        this.nodesArray.push(this.makeRow(n), { emitEvent: false });
      }
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.store.project()) return;
      const nodes: ProjectNode[] = this.nodesArray.controls.map((g) => {
        const v = g.getRawValue();
        return {
          id: Number(v.id),
          description: v.description as NodeKind,
          kFactor: Number(v.kFactor),
          elevationFt: Number(v.elevationFt),
          pressureEstimatePsi: v.pressureEstimatePsi != null ? Number(v.pressureEstimatePsi) : undefined,
          areaGroup: v.areaGroup || undefined,
          nonSprinklerFlowGpm: v.nonSprinklerFlowGpm != null ? Number(v.nonSprinklerFlowGpm) : undefined,
        };
      });
      this.store.patch({ nodes });
    });
  }

  addNode(kind: NodeKind): void {
    const nextId =
      this.nodesArray.length === 0
        ? 1
        : Math.max(...this.nodesArray.controls.map((g) => Number(g.value.id) || 0)) + 1;
    const project = this.store.project();
    const defaultK = kind === 'sprinkler' ? project?.defaultKFactor ?? 5.6 : 0;
    this.nodesArray.push(
      this.makeRow({
        id: nextId,
        description: kind,
        kFactor: defaultK,
        elevationFt: 10.5,
      }),
    );
  }

  remove(idx: number): void {
    this.nodesArray.removeAt(idx);
  }

  private makeRow(n: ProjectNode): FormGroup {
    return this.fb.nonNullable.group({
      id: [n.id, [Validators.required]],
      description: [n.description as NodeKind],
      kFactor: [n.kFactor],
      elevationFt: [n.elevationFt],
      pressureEstimatePsi: [n.pressureEstimatePsi ?? null],
      areaGroup: [n.areaGroup ?? ''],
      nonSprinklerFlowGpm: [n.nonSprinklerFlowGpm ?? null],
    });
  }
}
