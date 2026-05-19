import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';

import { EditorStore } from './editor-store';
import { HazardClass, PipeMaterialKey, SprinklerSystemType } from '../../core/models';

const HAZARDS: { value: HazardClass; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'ord-1', label: 'Ordinary 1' },
  { value: 'ord-2', label: 'Ordinary 2' },
  { value: 'eh-1', label: 'Extra Hazard 1' },
  { value: 'eh-2', label: 'Extra Hazard 2' },
];

const SYSTEM_TYPES: { value: SprinklerSystemType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'preaction', label: 'Preaction' },
  { value: 'deluge', label: 'Deluge' },
];

const PIPE_MATERIALS: { value: PipeMaterialKey; label: string }[] = [
  { value: 'schd-10-steel-dry', label: 'SCHD 10 STEEL, DRY' },
  { value: 'sched-10-wet-steel', label: 'SCHED 10 WET STEEL' },
  { value: 'schd-40-steel-wet', label: 'SCHD 40 STEEL, WET' },
  { value: 'schd-40-steel-dry', label: 'SCHD 40 STEEL, DRY' },
  { value: 'cpvc', label: 'CPVC' },
  { value: 'copper-type-l', label: 'COPPER TYPE L' },
];

@Component({
  selector: 'app-general-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
  ],
  template: `
    <form [formGroup]="form" class="general-form">
      <section>
        <h3>General Data</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Project Title</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Designed By</mat-label>
            <input matInput formControlName="designedBy" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Code Reference</mat-label>
            <input matInput formControlName="codeRef" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Approving Agency</mat-label>
            <input matInput formControlName="approvingAgency" />
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section formGroupName="client">
        <h3>Client</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Client Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Address</mat-label>
            <input matInput formControlName="address" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>City, State Zip</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section>
        <h3>Project Data</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Hazard Class</mat-label>
            <mat-select formControlName="hazardClass">
              @for (h of hazards; track h.value) {
                <mat-option [value]="h.value">{{ h.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sprinkler System Type</mat-label>
            <mat-select formControlName="sprinklerSystemType">
              @for (s of systemTypes; track s.value) {
                <mat-option [value]="s.value">{{ s.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Design Area Of Water Application (ft²)</mat-label>
            <input matInput type="number" formControlName="designAreaFt2" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Maximum Area Per Sprinkler (ft²)</mat-label>
            <input matInput type="number" formControlName="maxAreaPerSprinklerFt2" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Default Sprinkler K-Factor</mat-label>
            <input matInput type="number" step="0.01" formControlName="defaultKFactor" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Default Pipe Material</mat-label>
            <mat-select formControlName="defaultPipeMaterial">
              @for (m of materials; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section formGroupName="hoseStream">
        <h3>Hose Stream Allowance</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Inside Hose Stream (gpm)</mat-label>
            <input matInput type="number" formControlName="insideGpm" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Outside Hose Stream (gpm)</mat-label>
            <input matInput type="number" formControlName="outsideGpm" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>In Rack Sprinkler Allowance (gpm)</mat-label>
            <input matInput type="number" formControlName="inRackGpm" />
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section formGroupName="sprinklerSpec">
        <h3>Sprinkler Specifications</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Make</mat-label>
            <input matInput formControlName="make" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Model</mat-label>
            <input matInput formControlName="model" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Size</mat-label>
            <input matInput formControlName="size" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Temperature Rating (°F)</mat-label>
            <input matInput type="number" formControlName="tempRatingF" />
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section formGroupName="waterSupply">
        <h3>Water Supply Test Data</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Source Of Information</mat-label>
            <input matInput formControlName="source" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Test Hydrant ID</mat-label>
            <input matInput formControlName="hydrantId" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date Of Test</mat-label>
            <input matInput type="date" formControlName="testDate" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hydrant Elevation (ft)</mat-label>
            <input matInput type="number" formControlName="hydrantElevFt" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Static Pressure (psi)</mat-label>
            <input matInput type="number" step="0.01" formControlName="staticPsi" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Test Flow Rate (gpm)</mat-label>
            <input matInput type="number" step="0.01" formControlName="testFlowGpm" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Test Residual Pressure (psi)</mat-label>
            <input matInput type="number" step="0.01" formControlName="testResidualPsi" />
          </mat-form-field>
        </div>
      </section>

      <mat-divider></mat-divider>

      <section formGroupName="calc">
        <h3>Calculation Project Data</h3>
        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Calculation Mode</mat-label>
            <mat-select formControlName="mode">
              <mat-option value="demand">Demand</mat-option>
              <mat-option value="flow">Flow</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>HMD Minimum Residual Pressure (psi)</mat-label>
            <input matInput type="number" step="0.01" formControlName="hmdMinResidualPsi" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Minimum Desired Flow Density (gpm/ft²)</mat-label>
            <input matInput type="number" step="0.001" formControlName="minDesiredDensityGpmFt2" />
          </mat-form-field>
        </div>
      </section>
    </form>
  `,
  styles: [
    `
      :host { display: block; }
      .general-form {
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      section {
        padding: 12px 0 8px;
      }
      section h3 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 16px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--hf-text-muted);
      }
      section h3::before {
        content: '';
        width: 20px;
        height: 1px;
        background: var(--hf-border-strong);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      mat-form-field { width: 100%; }
      mat-divider {
        margin: 4px 0;
        border-color: var(--hf-border);
        opacity: 0.6;
      }
    `,
  ],
})
export class GeneralTabComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(EditorStore);

  readonly hazards = HAZARDS;
  readonly systemTypes = SYSTEM_TYPES;
  readonly materials = PIPE_MATERIALS;

  readonly form = this.fb.nonNullable.group({
    title: [''],
    designedBy: [''],
    date: [''],
    codeRef: [''],
    approvingAgency: [''],
    client: this.fb.nonNullable.group({
      name: [''],
      address: [''],
      city: [''],
      phone: [''],
    }),
    hazardClass: ['ord-1' as HazardClass],
    sprinklerSystemType: ['wet' as SprinklerSystemType],
    designAreaFt2: [1500],
    maxAreaPerSprinklerFt2: [130],
    defaultKFactor: [5.6],
    defaultPipeMaterial: ['schd-10-steel-dry' as PipeMaterialKey],
    hoseStream: this.fb.nonNullable.group({
      insideGpm: [0],
      outsideGpm: [0],
      inRackGpm: [0],
    }),
    sprinklerSpec: this.fb.nonNullable.group({
      make: [''],
      model: [''],
      size: [''],
      tempRatingF: [0],
    }),
    waterSupply: this.fb.nonNullable.group({
      source: [''],
      hydrantId: [''],
      testDate: [''],
      hydrantElevFt: [0],
      staticPsi: [0],
      testFlowGpm: [0],
      testResidualPsi: [0],
    }),
    calc: this.fb.nonNullable.group({
      mode: ['demand' as 'demand' | 'flow'],
      hmdMinResidualPsi: [7],
      minDesiredDensityGpmFt2: [0.15],
    }),
  });

  private loadedProjectId: string | null = null;

  constructor() {
    // Patch the form only on the *first* load of each project — not on every
    // store update (those originate from the form itself).
    effect(() => {
      const p = this.store.project();
      if (!p || p.id === this.loadedProjectId) return;
      this.loadedProjectId = p.id;
      this.form.patchValue(
        {
          title: p.title,
          designedBy: p.designedBy,
          date: p.date,
          codeRef: p.codeRef ?? '',
          approvingAgency: p.approvingAgency ?? '',
          client: p.client,
          hazardClass: p.hazardClass,
          sprinklerSystemType: p.sprinklerSystemType ?? 'wet',
          designAreaFt2: p.designAreaFt2,
          maxAreaPerSprinklerFt2: p.maxAreaPerSprinklerFt2,
          defaultKFactor: p.defaultKFactor,
          defaultPipeMaterial: p.defaultPipeMaterial,
          hoseStream: p.hoseStream,
          sprinklerSpec: p.sprinklerSpec ?? { make: '', model: '', size: '', tempRatingF: 0 },
          waterSupply: p.waterSupply,
          calc: p.calc,
        },
        { emitEvent: false },
      );
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.store.project()) return;
      this.store.patch(this.form.getRawValue());
    });
  }
}
