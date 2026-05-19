import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ProjectsService } from '../../core/projects/projects.service';
import { Project } from '../../core/models';
import { NewProjectDialogComponent } from './new-project-dialog.component';

@Component({
  selector: 'app-projects-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page">
      <header class="header">
        <div class="header__title">
          <h1>Projects</h1>
          <p class="muted">Hydraulic calculation projects for your organization.</p>
        </div>
        <div class="header__actions">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input
              type="search"
              placeholder="Search projects…"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
          <button class="btn btn--primary" (click)="openNew()">
            <span class="material-symbols-outlined">add</span>
            <span>New project</span>
          </button>
        </div>
      </header>

      @if (svc.error()) {
        <div class="banner banner--error" role="alert">
          <span class="material-symbols-outlined">error</span>
          <span>{{ svc.error() }}</span>
        </div>
      }

      @if (svc.loading()) {
        <div class="table-wrap">
          <table class="hf-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Hazard</th>
                <th class="hf-num">Design area</th>
                <th>Updated</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (_ of skeletonRows; track $index) {
                <tr>
                  <td><span class="hf-skeleton">______________________________</span></td>
                  <td><span class="hf-skeleton">__________</span></td>
                  <td><span class="hf-skeleton">_______</span></td>
                  <td><span class="hf-skeleton">_____________</span></td>
                  <td><span class="hf-skeleton">________</span></td>
                  <td></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!svc.hasProjects()) {
        <div class="empty">
          <svg class="empty__art" viewBox="0 0 200 120" aria-hidden="true">
            <g stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round">
              <line x1="20"  y1="60" x2="180" y2="60"/>
              <line x1="60"  y1="30" x2="60"  y2="90"/>
              <line x1="100" y1="30" x2="100" y2="90"/>
              <line x1="140" y1="30" x2="140" y2="90"/>
              <circle cx="60"  cy="30" r="4"/>
              <circle cx="100" cy="30" r="4"/>
              <circle cx="140" cy="30" r="4"/>
              <circle cx="60"  cy="90" r="4"/>
              <circle cx="100" cy="90" r="4"/>
              <circle cx="140" cy="90" r="4"/>
            </g>
          </svg>
          <h2>No projects yet</h2>
          <p>Create your first hydraulic calculation project to get started.</p>
          <button class="btn btn--primary" (click)="openNew()">
            <span class="material-symbols-outlined">add</span>
            <span>Create project</span>
          </button>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="hf-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Hazard</th>
                <th class="hf-num">Design area</th>
                <th>Updated</th>
                <th>Status</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr (click)="open(p.id)" class="row-clickable">
                  <td>
                    <div class="cell-title">
                      <span class="title-text">{{ p.title }}</span>
                      @if (p.client.name) {
                        <span class="title-sub">{{ p.client.name }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="hf-pill">{{ hazardLabel(p.hazardClass) }}</span>
                  </td>
                  <td class="hf-num">{{ p.designAreaFt2 | number }} ft²</td>
                  <td class="muted" [matTooltip]="fullDate(p.updatedAt)">{{ relative(p.updatedAt) }}</td>
                  <td>
                    @if (p.lastResult) {
                      <span class="hf-pill hf-pill-success">
                        <span class="hf-dot hf-dot-success"></span>
                        Calculated
                      </span>
                    } @else {
                      <span class="hf-pill">Draft</span>
                    }
                  </td>
                  <td class="actions-col" (click)="$event.stopPropagation()">
                    <button
                      class="icon-btn"
                      matTooltip="Open"
                      (click)="open(p.id)"
                      aria-label="Open project"
                    >
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                    <button
                      class="icon-btn icon-btn--danger"
                      matTooltip="Delete"
                      (click)="remove(p.id)"
                      aria-label="Delete project"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="no-match">No projects match “{{ search() }}”.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .header__title h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--hf-text);
    }
    .header__title .muted {
      margin: 4px 0 0;
      color: var(--hf-text-muted);
      font-size: 13px;
    }
    .header__actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .search {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search .material-symbols-outlined {
      position: absolute;
      left: 10px;
      color: var(--hf-text-faint);
      font-size: 18px;
      pointer-events: none;
    }
    .search input {
      width: 240px;
      height: 36px;
      padding: 0 12px 0 34px;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius-sm);
      color: var(--hf-text);
      font: inherit;
      font-size: 13px;
      transition: border-color var(--hf-dur) var(--hf-ease);
    }
    .search input::placeholder { color: var(--hf-text-faint); }
    .search input:focus {
      outline: none;
      border-color: var(--hf-primary);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border: 1px solid transparent;
      border-radius: var(--hf-radius-sm);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease),
                  border-color var(--hf-dur) var(--hf-ease);
    }
    .btn .material-symbols-outlined { font-size: 18px; }
    .btn--primary {
      background: var(--hf-amber);
      color: #1A1100;
      border-color: var(--hf-amber);
    }
    .btn--primary:hover { background: #FBBF24; border-color: #FBBF24; }

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

    .table-wrap {
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
      overflow: hidden;
    }

    .row-clickable { cursor: pointer; }
    .cell-title { display: flex; flex-direction: column; gap: 2px; }
    .title-text { color: var(--hf-text); font-weight: 500; }
    .title-sub  { color: var(--hf-text-muted); font-size: 11px; }
    .muted      { color: var(--hf-text-muted); }

    .actions-col { width: 110px; text-align: right; }
    .icon-btn {
      width: 28px; height: 28px;
      display: inline-flex;
      align-items: center; justify-content: center;
      border: none;
      background: transparent;
      color: var(--hf-text-muted);
      border-radius: var(--hf-radius-sm);
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease);
      opacity: 0;
    }
    .icon-btn .material-symbols-outlined { font-size: 18px; }
    .row-clickable:hover .icon-btn { opacity: 1; }
    .icon-btn:hover { background: var(--hf-surface-3); color: var(--hf-text); }
    .icon-btn--danger:hover { color: var(--hf-danger); }

    .no-match {
      text-align: center;
      padding: 32px !important;
      color: var(--hf-text-muted);
    }

    .empty {
      padding: 64px 24px;
      text-align: center;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius);
    }
    .empty__art {
      width: 160px;
      height: auto;
      color: var(--hf-border-strong);
      margin-bottom: 16px;
    }
    .empty h2 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 600;
      color: var(--hf-text);
    }
    .empty p {
      margin: 0 0 20px;
      color: var(--hf-text-muted);
      font-size: 13px;
    }
  `],
})
export class ProjectsListComponent implements OnInit {
  readonly svc = inject(ProjectsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly search = signal('');
  readonly skeletonRows = Array.from({ length: 5 });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.svc.projects();
    if (!q) return all;
    return all.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.client.name ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    void this.svc.refresh();
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }

  async openNew(): Promise<void> {
    const ref = this.dialog.open(NewProjectDialogComponent, { width: '420px' });
    const title = await ref.afterClosed().toPromise();
    if (!title) return;
    const id = await this.svc.create(title);
    await this.router.navigate(['/projects', id]);
  }

  async open(id: string): Promise<void> {
    await this.router.navigate(['/projects', id]);
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this project?')) return;
    await this.svc.remove(id);
  }

  private toDate(ts: unknown): Date {
    if (ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate();
    }
    if (typeof ts === 'number') return new Date(ts);
    return new Date();
  }

  relative(ts: unknown): string {
    const d = this.toDate(ts);
    const diff = Date.now() - d.getTime();
    const sec = Math.round(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
    if (day < 30) return `${Math.round(day / 7)} wk ago`;
    return d.toLocaleDateString();
  }

  fullDate(ts: unknown): string {
    return this.toDate(ts).toLocaleString();
  }

  hazardLabel(code: string): string {
    return (
      {
        light: 'Light',
        'ord-1': 'Ordinary 1',
        'ord-2': 'Ordinary 2',
        'eh-1': 'Extra Hazard 1',
        'eh-2': 'Extra Hazard 2',
      } as Record<string, string>
    )[code] ?? code;
  }
}
