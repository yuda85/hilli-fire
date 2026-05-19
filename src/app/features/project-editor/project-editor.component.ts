import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ProjectsService } from '../../core/projects/projects.service';
import { ShellState } from '../../shared/shell-state.service';
import { EditorStore } from './editor-store';
import { GeneralTabComponent } from './general-tab.component';
import { NodesTabComponent } from './nodes-tab.component';
import { PipesTabComponent } from './pipes-tab.component';
import { PumpTabComponent } from './pump-tab.component';
import { CalculateTabComponent } from './calculate-tab.component';
import { ReportTabComponent } from './report-tab.component';
import { DxfTabComponent } from './dxf-tab.component';

type TabKey = 'general' | 'dxf' | 'nodes' | 'pipes' | 'pump' | 'calculate' | 'report';

interface StepDef {
  key: TabKey;
  label: string;
  short: string;
}

const STEPS: StepDef[] = [
  { key: 'general',   label: 'General',   short: 'General' },
  { key: 'dxf',       label: 'DXF',       short: 'DXF' },
  { key: 'nodes',     label: 'Nodes',     short: 'Nodes' },
  { key: 'pipes',     label: 'Pipes',     short: 'Pipes' },
  { key: 'pump',      label: 'Pump',      short: 'Pump' },
  { key: 'calculate', label: 'Calculate', short: 'Calc' },
  { key: 'report',    label: 'Report',    short: 'Report' },
];

@Component({
  selector: 'app-project-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore],
  imports: [
    RouterLink,
    GeneralTabComponent,
    NodesTabComponent,
    PipesTabComponent,
    PumpTabComponent,
    CalculateTabComponent,
    ReportTabComponent,
    DxfTabComponent,
  ],
  template: `
    @if (notFound()) {
      <div class="page">
        <div class="empty">
          <span class="material-symbols-outlined empty__icon">search_off</span>
          <h2>Project not found</h2>
          <p>This project does not exist or you don't have access.</p>
          <a class="btn" routerLink="/projects">Back to projects</a>
        </div>
      </div>
    } @else if (store.project(); as p) {
      <div class="page">
        <header class="ed-header">
          <div class="ed-header__chips">
            <span class="chip">
              <span class="material-symbols-outlined">engineering</span>
              {{ p.designedBy || 'No designer' }}
            </span>
            <span class="chip">
              <span class="material-symbols-outlined">apartment</span>
              {{ p.client.name || 'No client' }}
            </span>
            <span class="chip">
              <span class="material-symbols-outlined">whatshot</span>
              {{ hazardLabel(p.hazardClass) }}
            </span>
          </div>
        </header>

        <nav class="stepper" role="tablist">
          @for (s of steps; let i = $index; track s.key) {
            <button
              type="button"
              role="tab"
              class="step"
              [class.step--active]="active() === s.key"
              [attr.aria-selected]="active() === s.key"
              (click)="setActive(s.key)"
            >
              <span class="step__num">{{ i + 1 }}</span>
              <span class="step__label">{{ s.label }}</span>
              @if (countFor(s.key); as c) {
                <span class="step__count">{{ c }}</span>
              }
              <span class="hf-dot" [class]="dotClassFor(s.key)"></span>
            </button>
          }
        </nav>

        <section class="content">
          @switch (active()) {
            @case ('general')   { <app-general-tab /> }
            @case ('dxf')       { <app-dxf-tab /> }
            @case ('nodes')     { <app-nodes-tab /> }
            @case ('pipes')     { <app-pipes-tab /> }
            @case ('pump')      { <app-pump-tab /> }
            @case ('calculate') { <app-calculate-tab /> }
            @case ('report')    { <app-report-tab /> }
          }
        </section>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }

    .ed-header {
      margin-bottom: 16px;
    }
    .ed-header__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: 999px;
      font-size: 12px;
      color: var(--hf-text-muted);
    }
    .chip .material-symbols-outlined {
      font-size: 14px;
      color: var(--hf-text-faint);
    }

    .stepper {
      display: flex;
      gap: 4px;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
      padding: 4px;
      overflow-x: auto;
      margin-bottom: 16px;
    }
    .step {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: transparent;
      border: none;
      border-radius: var(--hf-radius-sm);
      color: var(--hf-text-muted);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      position: relative;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease);
    }
    .step:hover { color: var(--hf-text); background: var(--hf-surface-2); }
    .step--active {
      color: var(--hf-text);
      background: var(--hf-surface-3);
    }
    .step--active::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: -5px;
      height: 2px;
      background: var(--hf-primary);
      border-radius: 2px;
    }
    .step__num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: var(--hf-surface-3);
      color: var(--hf-text-faint);
      font-family: var(--hf-font-num);
      font-size: 11px;
      font-weight: 600;
    }
    .step--active .step__num {
      background: var(--hf-primary);
      color: #fff;
    }
    .step__count {
      font-family: var(--hf-font-num);
      font-size: 11px;
      color: var(--hf-text-faint);
      padding: 1px 6px;
      background: var(--hf-surface-2);
      border-radius: 999px;
    }
    .step__label { font-weight: 500; }

    .content {
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
      overflow: hidden;
    }

    .empty {
      padding: 64px 24px;
      text-align: center;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
    }
    .empty__icon {
      font-size: 48px;
      color: var(--hf-text-faint);
      margin-bottom: 8px;
    }
    .empty h2 { margin: 0 0 4px; font-size: 18px; }
    .empty p { color: var(--hf-text-muted); margin: 0 0 16px; }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: var(--hf-radius-sm);
      background: var(--hf-surface-2);
      color: var(--hf-text);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--hf-border);
    }
  `],
})
export class ProjectEditorComponent implements OnInit, OnDestroy {
  readonly id = input.required<string>();

  private readonly svc = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellState);
  readonly store = inject(EditorStore);

  readonly steps = STEPS;
  readonly active = signal<TabKey>('general');

  private readonly _notFound = signal(false);
  readonly notFound = this._notFound.asReadonly();

  readonly nodesCount = computed(() => this.store.project()?.nodes?.length ?? 0);
  readonly pipesCount = computed(() => this.store.project()?.pipes?.length ?? 0);

  constructor() {
    // Sync project status into the global ShellState for the top-bar status pill
    // and breadcrumb tail.
    effect(() => {
      const title = this.store.project()?.title ?? null;
      this.shell.setBreadcrumb(title);
    });
    effect(() => {
      if (this.store.saving()) {
        this.shell.setEditorStatus('saving');
      } else if (this.store.dirty()) {
        this.shell.setEditorStatus('dirty');
      } else if (this.store.lastSavedAt()) {
        this.shell.setEditorStatus('saved');
      } else {
        this.shell.setEditorStatus('idle');
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.shell.setBusy(true);
    const p = await this.svc.load(this.id());
    if (!p) {
      this._notFound.set(true);
    } else {
      this.store.load(p);
    }
    this.shell.setBusy(false);
  }

  ngOnDestroy(): void {
    this.shell.setBreadcrumb(null);
    this.shell.setEditorStatus('idle');
  }

  setActive(k: TabKey): void {
    this.active.set(k);
  }

  countFor(k: TabKey): number | null {
    if (k === 'nodes') return this.nodesCount() || null;
    if (k === 'pipes') return this.pipesCount() || null;
    return null;
  }

  dotClassFor(k: TabKey): string {
    const p = this.store.project();
    if (!p) return '';
    switch (k) {
      case 'general':
        return p.title ? 'hf-dot-success' : '';
      case 'nodes':
        return this.nodesCount() > 0 ? 'hf-dot-success' : '';
      case 'pipes':
        return this.pipesCount() > 0 ? 'hf-dot-success' : '';
      case 'pump':
        return (p.pumpCurve?.some(pt => pt.flowGpm || pt.pressurePsi)) ? 'hf-dot-success' : '';
      case 'calculate':
        return p.lastResult ? 'hf-dot-success' : '';
      case 'report':
        return p.lastResult ? 'hf-dot-amber' : '';
      default:
        return '';
    }
  }

  hazardLabel(code: string): string {
    return ({
      light: 'Light',
      'ord-1': 'Ord-1',
      'ord-2': 'Ord-2',
      'eh-1': 'EH-1',
      'eh-2': 'EH-2',
    } as Record<string, string>)[code] ?? code;
  }

  @HostListener('window:beforeunload')
  async flush(): Promise<void> {
    await this.store.flush();
  }
}
