import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

import { EditorStore } from './editor-store';
import { importDxf, DxfImportResult } from '../../calc/dxf-import';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-dxf-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  template: `
    <div class="dxf-tab">
      <div class="toolbar">
        <h3>DXF Import</h3>
        <span class="spacer"></span>
        <input
          #fileInput
          type="file"
          accept=".dxf,.DXF"
          (change)="onFile($event)"
          style="display:none"
        />
        <button mat-stroked-button (click)="fileInput.click()" [disabled]="parsing()">
          @if (parsing()) {
            <mat-progress-spinner diameter="20" mode="indeterminate" />
            <span>Parsing…</span>
          } @else {
            <span>Choose DXF file</span>
          }
        </button>
      </div>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      <mat-expansion-panel class="requirements" expanded>
        <mat-expansion-panel-header>
          <mat-panel-title>What the DXF must contain</mat-panel-title>
        </mat-expansion-panel-header>

        <h4>Layers (case-insensitive; the <code>HF-</code> prefix is optional)</h4>
        <ul class="req-list">
          <li>
            <strong>SPRINKLERS</strong> — one <code>CIRCLE</code> or
            <code>POINT</code> per sprinkler. The center is the sprinkler
            location; the radius is ignored.
          </li>
          <li>
            <strong>JUNCTIONS</strong> (optional) — <code>CIRCLE</code> or
            <code>POINT</code> for non-discharge tees, headers, and risers.
          </li>
          <li>
            <strong>SOURCE</strong> — a single <code>CIRCLE</code> or
            <code>POINT</code> at the water-supply / inflow location.
          </li>
          <li>
            <strong>PIPES</strong> — <code>LINE</code> or
            <code>LWPOLYLINE</code> entities. Endpoints must land within
            <strong>6 inches</strong> of a sprinkler / junction / source center.
          </li>
        </ul>

        <h4>Drawing units</h4>
        <p>
          The importer reads <code>$INSUNITS</code> from the DXF header and
          converts coordinates to feet. Supported: inches, feet,
          millimeters, centimeters, meters. If <code>$INSUNITS</code> is
          missing, the drawing is assumed to be in feet.
        </p>

        <h4>Auto-assigned IDs</h4>
        <ul class="req-list">
          <li>Sprinklers: 1, 2, 3, … (in the order they appear)</li>
          <li>Junctions: 30, 31, 32, …</li>
          <li>Source: 100</li>
        </ul>

        <h4>Per-pipe overrides (optional)</h4>
        <p>
          Place <code>TEXT</code> or <code>MTEXT</code> on the
          <strong>PIPES</strong> layer near a pipe midpoint with content like
          <code>DN:2.0</code> to override that pipe's nominal diameter (in inches).
          Anything more complex (material, fitting count) can be edited in the
          Pipes tab after import.
        </p>

        <h4>Defaults applied at import time</h4>
        <ul class="req-list">
          <li>Sprinkler K-factor: <em>project default</em> (currently {{ defaultK() }})</li>
          <li>Sprinkler / junction elevation: 10.5 ft</li>
          <li>Source elevation: 0 ft</li>
          <li>Pipe material: <em>project default</em> (currently {{ defaultMaterial() }})</li>
          <li>Pipe nominal diameter: 1.5 in (unless <code>DN:</code> annotation present)</li>
        </ul>

        <p class="hint">
          Edit any of these per-node / per-pipe in the Nodes and Pipes tabs
          after the import.
        </p>
      </mat-expansion-panel>

      @if (result(); as r) {
        <mat-divider class="block-divider"></mat-divider>

        <mat-card appearance="outlined" class="result-card">
          <h4>Parsed results</h4>
          <div class="stats">
            <div><span class="muted">Sprinklers</span><strong>{{ r.stats.sprinklersFound }}</strong></div>
            <div><span class="muted">Junctions</span><strong>{{ r.stats.junctionsFound }}</strong></div>
            <div><span class="muted">Source</span><strong>{{ r.stats.sourceFound ? 'yes' : 'no' }}</strong></div>
            <div><span class="muted">Pipes</span><strong>{{ r.stats.pipesFound }}</strong></div>
            <div><span class="muted">Drawing unit</span><strong>{{ r.stats.drawingUnit }}</strong></div>
            <div><span class="muted">Unsnapped pipes</span><strong>{{ r.stats.pipesUnsnapped }}</strong></div>
          </div>

          @if (r.warnings.length > 0) {
            <h4>Warnings</h4>
            <ul class="warnings">
              @for (w of r.warnings; track w) {
                <li>{{ w }}</li>
              }
            </ul>
          }

          <div class="actions">
            <button
              mat-flat-button
              color="primary"
              (click)="applyImport(r)"
              [disabled]="r.nodes.length === 0"
            >
              <span>Replace project topology with this import</span>
            </button>
            <button mat-stroked-button (click)="clearResult()">
              <span>Discard</span>
            </button>
          </div>

          <p class="hint">
            <strong>Heads-up:</strong> applying will replace the current
            <em>Nodes</em> and <em>Pipes</em> with the imported data.
          </p>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .dxf-tab {
        padding: 24px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }
      h3 {
        margin: 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.8;
        color: var(--mat-sys-primary);
      }
      h4 {
        margin: 16px 0 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.7;
      }
      .requirements {
        background: var(--mat-sys-surface-container);
      }
      .req-list {
        line-height: 1.7;
        padding-left: 18px;
      }
      .hint {
        opacity: 0.7;
        font-style: italic;
      }
      code {
        background: rgba(255, 255, 255, 0.06);
        padding: 0 4px;
        border-radius: 3px;
      }
      .result-card {
        padding: 24px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .stats > div {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .muted {
        font-size: 12px;
        opacity: 0.6;
      }
      strong {
        font-size: 16px;
      }
      .warnings {
        background: rgba(255, 170, 0, 0.08);
        border-left: 3px solid #ffaa00;
        padding: 8px 12px 8px 30px;
        margin: 0 0 16px;
        color: #ffc66b;
        font-size: 13px;
        line-height: 1.5;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      .error {
        background: rgba(255, 80, 80, 0.12);
        color: #ff8a8a;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }
      .block-divider {
        margin: 16px 0;
      }
    `,
  ],
})
export class DxfTabComponent {
  readonly store = inject(EditorStore);
  private readonly toast = inject(ToastService);
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly parsing = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<DxfImportResult | null>(null);

  defaultK(): number {
    return this.store.project()?.defaultKFactor ?? 5.6;
  }

  defaultMaterial(): string {
    return this.store.project()?.defaultPipeMaterial ?? 'schd-10-steel-dry';
  }

  async onFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.parsing.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const text = await file.text();
      const project = this.store.project();
      if (!project) throw new Error('Project not loaded');
      const result = importDxf(text, {
        defaultKFactor: project.defaultKFactor,
        defaultMaterial: project.defaultPipeMaterial,
        defaultElevationFt: 10.5,
        defaultPipeDiameterIn: 1.5,
      });
      this.result.set(result);
      this.toast.success(
        `DXF parsed: ${result.stats.sprinklersFound} sprinklers, ${result.stats.pipesFound} pipes.`,
      );
    } catch (e) {
      const msg = (e as Error).message;
      this.error.set(msg);
      this.toast.error(`DXF parse failed: ${msg}`);
    } finally {
      this.parsing.set(false);
      // Reset the input so re-selecting the same file works.
      const el = this.fileInput()?.nativeElement;
      if (el) el.value = '';
    }
  }

  applyImport(result: DxfImportResult): void {
    const project = this.store.project();
    if (!project) return;
    if (!confirm('This will replace all current Nodes and Pipes with the imported data. Continue?')) {
      return;
    }
    this.store.patch({ nodes: result.nodes, pipes: result.pipes });
    this.toast.success(
      `Imported ${result.nodes.length} nodes and ${result.pipes.length} pipes. Edit details in Nodes / Pipes tabs.`,
    );
    this.result.set(null);
  }

  clearResult(): void {
    this.result.set(null);
  }
}
