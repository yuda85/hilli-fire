import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { EditorStore } from './editor-store';
import { downloadProjectReport } from '../../reporting/pdf-report';
import { BrandMarkComponent } from '../../shared/brand/brand-mark.component';

@Component({
  selector: 'app-report-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandMarkComponent],
  template: `
    <div class="report-tab">
      <header class="head">
        <div>
          <h3>Hydraulic Calculation Report</h3>
          <p class="muted">15-page Elite Software Fire–style PDF with full project data &amp; outputs.</p>
        </div>
      </header>

      @if (error()) {
        <div class="banner banner--error" role="alert">
          <span class="material-symbols-outlined">error</span>
          <span>{{ error() }}</span>
        </div>
      }

      <div class="layout">
        <section class="info">
          <h4 class="hf-section-title">What's in the report</h4>
          <ul class="features">
            <li><span class="material-symbols-outlined">check_circle</span> Title page with project &amp; client info</li>
            <li><span class="material-symbols-outlined">check_circle</span> General Project Data (hazard, design area, K-factor, water supply, calc params)</li>
            <li><span class="material-symbols-outlined">check_circle</span> Node Input Data and Pipe Input Data tables</li>
            <li><span class="material-symbols-outlined">check_circle</span> Per-node, per-pipe, and per-sprinkler output tables</li>
            <li><span class="material-symbols-outlined">check_circle</span> Output Summary (HMD sprinkler, velocity, network totals)</li>
            <li><span class="material-symbols-outlined">check_circle</span> Hydraulic Supply / Demand graph + pump curve data</li>
          </ul>

          @if (!hasResult()) {
            <div class="banner banner--warn">
              <span class="material-symbols-outlined">warning</span>
              <span>Run the calculation first — the report mirrors the most recent solver output.</span>
            </div>
          }
        </section>

        <section class="preview">
          <div class="page-preview" aria-label="PDF cover preview">
            <div class="page-preview__head">
              <hf-brand-mark />
            </div>
            <div class="page-preview__body">
              <div class="rule"></div>
              <h2>{{ projectTitle() }}</h2>
              <p>Hydraulic Calculation Report</p>
              <div class="kv">
                <span class="kv__k">Designer</span>
                <span class="kv__v">{{ designedBy() }}</span>
              </div>
              <div class="kv">
                <span class="kv__k">Client</span>
                <span class="kv__v">{{ clientName() }}</span>
              </div>
              <div class="kv">
                <span class="kv__k">Date</span>
                <span class="kv__v">{{ today() }}</span>
              </div>
              <div class="kv">
                <span class="kv__k">Status</span>
                <span class="kv__v">
                  @if (hasResult()) {
                    <span class="hf-pill hf-pill-success">
                      <span class="hf-dot hf-dot-success"></span>
                      Calculated
                    </span>
                  } @else {
                    <span class="hf-pill">Draft</span>
                  }
                </span>
              </div>
            </div>
            <div class="page-preview__foot">
              <span>NFPA-13 · Hazen-Williams</span>
              <span>1 / 15</span>
            </div>
          </div>

          <button
            class="download-btn"
            (click)="download()"
            [disabled]="generating() || !hasResult()"
          >
            @if (generating()) {
              <span class="spinner"></span>
              <span>Generating PDF…</span>
            } @else {
              <span class="material-symbols-outlined">download</span>
              <span>Download PDF</span>
            }
          </button>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .report-tab { padding: 24px; }

    .head { margin-bottom: 20px; }
    .head h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--hf-text);
    }
    .head .muted {
      margin: 2px 0 0;
      color: var(--hf-text-muted);
      font-size: 12px;
    }

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
    .banner--warn {
      background: var(--hf-amber-soft);
      color: var(--hf-amber);
      border-left: 3px solid var(--hf-amber);
      margin-top: 16px;
    }
    .banner .material-symbols-outlined { font-size: 16px; }

    .layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    @media (min-width: 1024px) {
      .layout { grid-template-columns: 1fr 320px; }
    }

    .features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .features li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--hf-text);
      line-height: 1.5;
    }
    .features .material-symbols-outlined {
      font-size: 16px;
      color: var(--hf-success);
      margin-top: 2px;
      flex-shrink: 0;
    }

    /* ---------- Preview ---------- */
    .preview {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }
    .page-preview {
      aspect-ratio: 8.5 / 11;
      background: #FAFAFA;
      color: #111;
      border: 1px solid var(--hf-border-strong);
      border-radius: var(--hf-radius-sm);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
      display: flex;
      flex-direction: column;
      padding: 24px 22px;
      overflow: hidden;
    }
    .page-preview__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .page-preview__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
    }
    .page-preview__body .rule {
      width: 48px;
      height: 2px;
      background: var(--hf-danger);
      margin-bottom: 10px;
    }
    .page-preview__body h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #111;
      line-height: 1.2;
    }
    .page-preview__body > p {
      margin: 0 0 14px;
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .kv {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 5px 0;
      border-bottom: 1px solid #E5E5E5;
      font-size: 11px;
    }
    .kv__k { color: #666; }
    .kv__v {
      color: #111;
      font-weight: 500;
      max-width: 60%;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .page-preview__foot {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-top: 1px solid #E5E5E5;
      padding-top: 8px;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 40px;
      padding: 0 16px;
      background: var(--hf-primary);
      color: #fff;
      border: 1px solid var(--hf-primary);
      border-radius: var(--hf-radius-sm);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease);
    }
    .download-btn:hover:not(:disabled) { background: var(--hf-primary-hover); }
    .download-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .download-btn .material-symbols-outlined { font-size: 18px; }

    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: hf-spin 0.8s linear infinite;
    }
    @keyframes hf-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .spinner { animation: none; }
    }
  `],
})
export class ReportTabComponent {
  readonly store = inject(EditorStore);

  readonly generating = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasResult = computed(() => !!this.store.project()?.lastResult);

  readonly projectTitle = computed(() => this.store.project()?.title || 'Untitled project');
  readonly designedBy = computed(() => this.store.project()?.designedBy || '—');
  readonly clientName = computed(() => this.store.project()?.client?.name || '—');

  today(): string {
    return new Date().toLocaleDateString();
  }

  async download(): Promise<void> {
    const project = this.store.project();
    if (!project) return;
    this.generating.set(true);
    this.error.set(null);
    try {
      await this.store.flush();
      await downloadProjectReport(project, project.lastResult);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.generating.set(false);
    }
  }
}
