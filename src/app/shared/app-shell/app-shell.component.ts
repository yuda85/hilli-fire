import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../core/auth/auth.service';
import { BrandMarkComponent } from '../brand/brand-mark.component';
import { ThemeService } from '../theme/theme.service';
import { ShellState } from '../shell-state.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    BrandMarkComponent,
  ],
  template: `
    <div class="shell">
      <aside class="sidenav">
        <div class="sidenav__brand">
          <hf-brand-mark />
        </div>

        <nav class="nav">
          <div class="nav__section">Workspace</div>
          <a class="nav__link" routerLink="/projects" routerLinkActive="nav__link--active">
            <span class="material-symbols-outlined">folder</span>
            <span>Projects</span>
          </a>

          <div class="nav__section">Library</div>
          <button class="nav__link nav__link--disabled" matTooltip="Coming soon" disabled>
            <span class="material-symbols-outlined">straighten</span>
            <span>Pipe materials</span>
          </button>
          <button class="nav__link nav__link--disabled" matTooltip="Coming soon" disabled>
            <span class="material-symbols-outlined">conversion_path</span>
            <span>Fittings</span>
          </button>

          <div class="nav__section">Help</div>
          <a class="nav__link" href="https://github.com" target="_blank" rel="noopener">
            <span class="material-symbols-outlined">menu_book</span>
            <span>Docs</span>
          </a>
        </nav>

        <div class="sidenav__foot">
          <div class="toggle-group" role="group" aria-label="Display units">
            <button
              type="button"
              class="toggle"
              [class.toggle--active]="shell.units() === 'us'"
              (click)="shell.setUnits('us')"
            >US</button>
            <button
              type="button"
              class="toggle"
              [class.toggle--active]="shell.units() === 'metric'"
              (click)="shell.setUnits('metric')"
            >SI</button>
          </div>
          <button
            type="button"
            class="theme-toggle"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span class="material-symbols-outlined">
              {{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div class="breadcrumb">
            <a routerLink="/projects" class="breadcrumb__root">Projects</a>
            @if (shell.breadcrumbTail()) {
              <span class="breadcrumb__sep material-symbols-outlined">chevron_right</span>
              <span class="breadcrumb__tail">{{ shell.breadcrumbTail() }}</span>
            }
          </div>

          <span class="spacer"></span>

          @if (statusLabel()) {
            <div class="status-pill" [class]="'status-pill--' + shell.editorStatus()">
              @switch (shell.editorStatus()) {
                @case ('saving') {
                  <span class="material-symbols-outlined spin">progress_activity</span>
                }
                @case ('dirty') {
                  <span class="hf-dot hf-dot-amber"></span>
                }
                @case ('saved') {
                  <span class="material-symbols-outlined">check_circle</span>
                }
              }
              <span>{{ statusLabel() }}</span>
            </div>
          }

          <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
            <span class="material-symbols-outlined">account_circle</span>
            <span class="user-btn__name">
              {{ auth.profile()?.displayName || auth.user()?.email || 'User' }}
            </span>
            <span class="material-symbols-outlined chev">expand_more</span>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <span>{{ auth.user()?.email }}</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <span class="material-symbols-outlined">logout</span>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </header>

        @if (shell.busy()) {
          <mat-progress-bar mode="indeterminate" class="hf-top-progress" />
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .shell {
      display: grid;
      grid-template-columns: 240px 1fr;
      height: 100vh;
      background: var(--hf-bg);
    }

    /* ---------- Sidenav ---------- */
    .sidenav {
      display: flex;
      flex-direction: column;
      background: var(--hf-surface);
      border-right: 1px solid var(--hf-border);
      overflow: hidden;
    }
    .sidenav__brand {
      display: flex;
      align-items: center;
      padding: 18px 20px;
      height: 56px;
      border-bottom: 1px solid var(--hf-border);
    }
    .nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav__section {
      margin: 14px 8px 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--hf-text-faint);
    }
    .nav__section:first-child { margin-top: 0; }

    .nav__link {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      background: transparent;
      color: var(--hf-text-muted);
      text-decoration: none;
      border-radius: var(--hf-radius-sm);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      position: relative;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease);
    }
    .nav__link .material-symbols-outlined {
      font-size: 20px;
      flex-shrink: 0;
    }
    .nav__link:not(.nav__link--disabled):hover {
      background: var(--hf-surface-2);
      color: var(--hf-text);
    }
    .nav__link--active {
      background: var(--hf-surface-2);
      color: var(--hf-text);
    }
    .nav__link--active::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      border-radius: 2px;
      background: var(--hf-primary);
    }
    .nav__link--disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .sidenav__foot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid var(--hf-border);
    }

    .toggle-group {
      display: inline-flex;
      background: var(--hf-surface-2);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius-sm);
      padding: 2px;
      flex: 1;
    }
    .toggle {
      flex: 1;
      padding: 4px 8px;
      border: none;
      background: transparent;
      color: var(--hf-text-muted);
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease);
    }
    .toggle:hover { color: var(--hf-text); }
    .toggle--active {
      background: var(--hf-surface);
      color: var(--hf-text);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    .theme-toggle {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--hf-border);
      background: var(--hf-surface-2);
      color: var(--hf-text-muted);
      border-radius: var(--hf-radius-sm);
      cursor: pointer;
      transition: background-color var(--hf-dur) var(--hf-ease),
                  color var(--hf-dur) var(--hf-ease);
    }
    .theme-toggle:hover { color: var(--hf-text); background: var(--hf-surface-3); }
    .theme-toggle .material-symbols-outlined { font-size: 18px; }

    /* ---------- Main ---------- */
    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }

    .topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 56px;
      padding: 0 24px;
      background: var(--hf-surface);
      border-bottom: 1px solid var(--hf-border);
      position: sticky;
      top: 0;
      z-index: 12;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      min-width: 0;
    }
    .breadcrumb__root {
      color: var(--hf-text-muted);
      text-decoration: none;
      font-weight: 500;
      transition: color var(--hf-dur) var(--hf-ease);
    }
    .breadcrumb__root:hover { color: var(--hf-text); }
    .breadcrumb__sep {
      font-size: 18px;
      color: var(--hf-text-faint);
    }
    .breadcrumb__tail {
      color: var(--hf-text);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60vw;
    }

    .spacer { flex: 1 1 auto; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      background: var(--hf-surface-2);
      color: var(--hf-text-muted);
      border: 1px solid var(--hf-border);
    }
    .status-pill .material-symbols-outlined { font-size: 14px; }
    .status-pill--saving { color: var(--hf-info); background: var(--hf-info-soft); border-color: transparent; }
    .status-pill--dirty  { color: var(--hf-amber); background: var(--hf-amber-soft); border-color: transparent; }
    .status-pill--saved  { color: var(--hf-success); background: var(--hf-success-soft); border-color: transparent; }

    .spin {
      animation: hf-spin 1s linear infinite;
    }
    @keyframes hf-spin {
      to { transform: rotate(360deg); }
    }

    .user-btn {
      display: inline-flex !important;
      align-items: center;
      gap: 6px;
      color: var(--hf-text) !important;
    }
    .user-btn__name {
      font-size: 13px;
      font-weight: 500;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-btn .chev { font-size: 18px; opacity: 0.6; }

    .content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      background: var(--hf-bg);
    }

    @media (prefers-reduced-motion: reduce) {
      .spin { animation: none; }
    }
  `],
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly shell = inject(ShellState);

  readonly statusLabel = computed(() => {
    switch (this.shell.editorStatus()) {
      case 'saving': return 'Saving…';
      case 'dirty':  return 'Unsaved';
      case 'saved':  return 'Saved';
      default:       return '';
    }
  });

  async logout(): Promise<void> {
    await this.auth.logout();
    location.assign('/login');
  }
}
