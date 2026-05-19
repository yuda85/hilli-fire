import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { EditorStore } from './editor-store';
import { runCalculation } from '../../calc';
import { CalcResult } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-calculate-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="calc-tab">
      <header class="toolbar">
        <div class="toolbar__title">
          <h3>Hydraulic calculation</h3>
          @if (lastRunAt(); as t) {
            <p class="muted">Last run: {{ t }}</p>
          } @else {
            <p class="muted">Run the network solver to see outputs.</p>
          }
        </div>
        <span class="spacer"></span>
        <button class="run-btn" (click)="run()" [disabled]="running()">
          @if (running()) {
            <span class="spinner"></span>
            <span>Calculating…</span>
          } @else {
            <span class="material-symbols-outlined">play_arrow</span>
            <span>Run calculation</span>
          }
        </button>
      </header>

      @if (error()) {
        <div class="banner banner--error" role="alert">
          <span class="material-symbols-outlined">error</span>
          <span>{{ error() }}</span>
        </div>
      }

      @if (result(); as r) {
        <!-- Hero KPI band -->
        <section class="kpi-band">
          <article class="kpi">
            <div class="kpi__head">
              <span class="kpi__label">HMD Residual</span>
              <span class="hf-dot" [class]="residualOk(r) ? 'hf-dot-success' : 'hf-dot-danger'"></span>
            </div>
            <div class="kpi__value">
              <span class="hf-num">{{ r.hmdResidualPsi | number: '1.1-1' }}</span>
              <span class="kpi__unit">psi</span>
            </div>
            <div class="kpi__sub">Node {{ r.hmdNodeId }}</div>
          </article>

          <article class="kpi">
            <div class="kpi__head">
              <span class="kpi__label">HMD Flow</span>
              <span class="hf-dot hf-dot-primary"></span>
            </div>
            <div class="kpi__value">
              <span class="hf-num">{{ r.hmdFlowGpm | number: '1.0-1' }}</span>
              <span class="kpi__unit">gpm</span>
            </div>
            <div class="kpi__sub">Most demanding sprinkler</div>
          </article>

          <article class="kpi">
            <div class="kpi__head">
              <span class="kpi__label">Total Sprinkler Flow</span>
              <span class="hf-dot hf-dot-info"></span>
            </div>
            <div class="kpi__value">
              <span class="hf-num">{{ r.totalSprinklerFlowGpm | number: '1.0-1' }}</span>
              <span class="kpi__unit">gpm</span>
            </div>
            <div class="kpi__sub">{{ r.sprinklers.length }} flowing</div>
          </article>

          <article class="kpi">
            <div class="kpi__head">
              <span class="kpi__label">Max Velocity</span>
              <span class="hf-dot" [class]="velocityClass(r.maxVelocityFps)"></span>
            </div>
            <div class="kpi__value">
              <span class="hf-num">{{ r.maxVelocityFps | number: '1.1-1' }}</span>
              <span class="kpi__unit">ft/s</span>
            </div>
            <div class="kpi__sub">{{ velocityBand(r.maxVelocityFps) }}</div>
          </article>
        </section>

        <!-- Secondary summary -->
        <section class="summary">
          <h4 class="hf-section-title">Output summary</h4>
          <dl class="summary-grid">
            <div><dt>Inflow Residual Pressure</dt><dd class="hf-num">{{ r.inflowResidualPsi | number: '1.2-2' }} psi</dd></div>
            <div><dt>Application Avg Density</dt><dd class="hf-num">{{ r.applicationAverageDensityGpmFt2 | number: '1.3-3' }} gpm/ft²</dd></div>
            <div><dt>Avg Area Per Sprinkler</dt><dd class="hf-num">{{ r.applicationAverageAreaPerSprinklerFt2 | number: '1.2-2' }} ft²</dd></div>
            <div><dt>Avg Sprinkler Flow</dt><dd class="hf-num">{{ r.averageSprinklerFlowGpm | number: '1.2-2' }} gpm</dd></div>
            <div><dt>Pipe Water Volume</dt><dd class="hf-num">{{ r.pipeWaterVolumeGal | number: '1.2-2' }} gal</dd></div>
            <div><dt>Nodal Imbalance</dt><dd class="hf-num">{{ r.actualMaxNodePressureImbalancePsi | number: '1.4-4' }} psi</dd></div>
          </dl>
        </section>

        <!-- Sprinklers -->
        <details class="result-section" open>
          <summary>
            <span class="material-symbols-outlined chev">expand_more</span>
            <span>Group peak sprinklers</span>
            <span class="count">{{ r.sprinklers.length }}</span>
          </summary>
          <div class="table-scroll">
            <table class="hf-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th class="hf-num">K</th>
                  <th class="hf-num">Elev (ft)</th>
                  <th class="hf-num">Residual (psi)</th>
                  <th class="hf-num">Area (ft²)</th>
                  <th class="hf-num">Density (gpm/ft²)</th>
                  <th class="hf-num">Discharge (gpm)</th>
                </tr>
              </thead>
              <tbody>
                @for (s of r.sprinklers; track s.nodeId) {
                  <tr>
                    <td>{{ s.nodeId }}</td>
                    <td class="hf-num">{{ s.kFactor | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ s.elevationFt | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ s.residualPressurePsi | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ s.flowingAreaFt2 | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ s.densityGpmFt2 | number: '1.3-3' }}</td>
                    <td class="hf-num">{{ s.dischargeGpm | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>

        <!-- Pipes -->
        <details class="result-section" open>
          <summary>
            <span class="material-symbols-outlined chev">expand_more</span>
            <span>Group peak pipes</span>
            <span class="count">{{ r.pipes.length }}</span>
          </summary>
          <div class="table-scroll">
            <table class="hf-table">
              <thead>
                <tr>
                  <th>Beg → End</th>
                  <th class="hf-num">Q (gpm)</th>
                  <th class="hf-num">V (ft/s)</th>
                  <th class="hf-num">F.L./ft (psi/ft)</th>
                  <th class="hf-num">Pipe + Fit (ft)</th>
                  <th class="hf-num">Total (ft)</th>
                  <th class="hf-num">PF (psi)</th>
                  <th class="hf-num">PE (psi)</th>
                  <th class="hf-num">PT (psi)</th>
                </tr>
              </thead>
              <tbody>
                @for (p of r.pipes; track $index) {
                  <tr>
                    <td><span class="hf-num">{{ p.begNode }} → {{ p.endNode }}</span></td>
                    <td class="hf-num">{{ p.flowGpm | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ p.velocityFps | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ p.frictionLossPsiPerFt | number: '1.5-5' }}</td>
                    <td class="hf-num">{{ p.pipeLengthFt | number: '1.2-2' }} + {{ p.fittingLengthFt | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ p.totalLengthFt | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ p.pfPsi | number: '1.3-3' }}</td>
                    <td class="hf-num">{{ p.pePsi | number: '1.3-3' }}</td>
                    <td class="hf-num">{{ p.ptPsi | number: '1.3-3' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>

        <!-- Nodes -->
        <details class="result-section">
          <summary>
            <span class="material-symbols-outlined chev">expand_more</span>
            <span>Group peak node groupings</span>
            <span class="count">{{ r.nodes.length }}</span>
          </summary>
          <div class="table-scroll">
            <table class="hf-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th class="hf-num">Residual (psi)</th>
                  <th class="hf-num">Sprinkler Flow (gpm)</th>
                  <th class="hf-num">Non-Sprinkler Flow (gpm)</th>
                </tr>
              </thead>
              <tbody>
                @for (n of r.nodes; track n.id) {
                  <tr>
                    <td>{{ n.id }}</td>
                    <td class="hf-num">{{ n.residualPressurePsi | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ n.sprinklerFlowGpm | number: '1.2-2' }}</td>
                    <td class="hf-num">{{ n.nonSprinklerFlowGpm | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>
      } @else if (!running()) {
        <div class="empty">
          <svg class="empty__art" viewBox="0 0 64 64" aria-hidden="true">
            <path
              d="M32 8c4 6 9 10 9 17 0 6-4 11-9 11s-9-5-9-11c0-3 1-5 2-7 1 2 2 3 4 3 2 0 2-2 2-4 0-4-2-6-2-9z"
              fill="none" stroke="currentColor" stroke-width="1.5"
            />
            <path
              d="M32 44c-3 0-5-2-5-5 0-2 1-4 2-5 0 1 1 2 2 2 1 0 2-1 2-2 0-1 0-2-1-3 2 0 5 3 5 6 0 4-2 7-5 7z"
              fill="none" stroke="currentColor" stroke-width="1.5"
            />
          </svg>
          <h3>No calculation yet</h3>
          <p>Click <strong>Run calculation</strong> to solve the hydraulic network.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .calc-tab { padding: 24px; }

    .toolbar {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .toolbar__title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--hf-text);
    }
    .toolbar__title .muted {
      margin: 2px 0 0;
      color: var(--hf-text-muted);
      font-size: 12px;
    }
    .spacer { flex: 1 1 auto; }

    .run-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 18px;
      background: var(--hf-amber);
      color: #1A1100;
      border: 1px solid var(--hf-amber);
      border-radius: var(--hf-radius-sm);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease);
    }
    .run-btn:hover:not(:disabled) { background: #FBBF24; }
    .run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .run-btn .material-symbols-outlined { font-size: 18px; }

    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.25);
      border-top-color: #1A1100;
      border-radius: 50%;
      animation: hf-spin 0.8s linear infinite;
    }
    @keyframes hf-spin { to { transform: rotate(360deg); } }

    .banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--hf-radius-sm);
      font-size: 13px;
      margin-bottom: 16px;
    }
    .banner--error {
      background: var(--hf-danger-soft);
      color: var(--hf-danger);
      border-left: 3px solid var(--hf-danger);
    }
    .banner .material-symbols-outlined { font-size: 16px; }

    /* ---------- KPI band ---------- */
    .kpi-band {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 1280px) {
      .kpi-band { grid-template-columns: repeat(4, 1fr); }
    }
    .kpi {
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kpi__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kpi__label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--hf-text-muted);
    }
    .kpi__value {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      color: var(--hf-text);
    }
    .kpi__value .hf-num {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .kpi__unit {
      color: var(--hf-text-faint);
      font-size: 13px;
    }
    .kpi__sub {
      font-size: 12px;
      color: var(--hf-text-muted);
    }

    /* ---------- Secondary summary ---------- */
    .summary { margin-bottom: 24px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px 24px;
      margin: 0;
    }
    .summary-grid > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid var(--hf-border);
    }
    .summary-grid dt {
      font-size: 12px;
      color: var(--hf-text-muted);
    }
    .summary-grid dd {
      margin: 0;
      font-size: 13px;
      color: var(--hf-text);
      font-weight: 500;
    }

    /* ---------- Result sections (details) ---------- */
    .result-section {
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .result-section > summary {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      cursor: pointer;
      list-style: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--hf-text);
      transition: background-color var(--hf-dur) var(--hf-ease);
      user-select: none;
    }
    .result-section > summary::-webkit-details-marker { display: none; }
    .result-section > summary:hover { background: var(--hf-surface-2); }
    .result-section .chev {
      font-size: 18px;
      color: var(--hf-text-muted);
      transition: transform var(--hf-dur) var(--hf-ease);
    }
    .result-section:not([open]) .chev { transform: rotate(-90deg); }
    .result-section .count {
      margin-left: auto;
      font-family: var(--hf-font-num);
      font-size: 11px;
      padding: 1px 8px;
      background: var(--hf-surface-2);
      border-radius: 999px;
      color: var(--hf-text-muted);
      font-weight: 500;
    }

    .table-scroll {
      max-height: 420px;
      overflow: auto;
      border-top: 1px solid var(--hf-border);
    }

    /* ---------- Empty ---------- */
    .empty {
      padding: 64px 24px;
      text-align: center;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
    }
    .empty__art {
      width: 64px; height: 64px;
      color: var(--hf-text-faint);
      margin-bottom: 12px;
    }
    .empty h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
      color: var(--hf-text);
    }
    .empty p {
      margin: 0;
      color: var(--hf-text-muted);
      font-size: 13px;
    }
    .empty strong { color: var(--hf-text); }

    @media (prefers-reduced-motion: reduce) {
      .spinner { animation: none; }
    }
  `],
})
export class CalculateTabComponent {
  readonly store = inject(EditorStore);
  private readonly toast = inject(ToastService);

  readonly running = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = computed(() => this.store.project()?.lastResult ?? null);

  private readonly _lastRunAt = signal<number | null>(null);

  readonly lastRunAt = computed(() => {
    const t = this._lastRunAt();
    if (!t) return null;
    return new Date(t).toLocaleTimeString();
  });

  residualOk(r: CalcResult): boolean {
    const min = this.store.project()?.calc.hmdMinResidualPsi ?? 7;
    return r.hmdResidualPsi >= min;
  }

  velocityClass(v: number): string {
    if (v <= 20) return 'hf-dot-success';
    if (v <= 32) return 'hf-dot-amber';
    return 'hf-dot-danger';
  }

  velocityBand(v: number): string {
    if (v <= 20) return 'Within limits';
    if (v <= 32) return 'Approaching limit';
    return 'Exceeds NFPA limit';
  }

  async run(): Promise<void> {
    const project = this.store.project();
    if (!project) return;
    this.running.set(true);
    this.error.set(null);
    try {
      await this.store.flush();
      await new Promise((r) => setTimeout(r, 0));
      const result: CalcResult = runCalculation(project);
      this.store.patch({ lastResult: result });
      await this.store.flush();
      this._lastRunAt.set(Date.now());
      this.toast.success(`Calculation complete — HMD at node ${result.hmdNodeId}.`);
    } catch (e) {
      const msg = (e as Error).message;
      this.error.set(msg);
      this.toast.error(`Calculation failed: ${msg}`);
    } finally {
      this.running.set(false);
    }
  }
}
