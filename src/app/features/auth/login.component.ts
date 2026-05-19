import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/auth/auth.service';
import { BrandMarkComponent } from '../../shared/brand/brand-mark.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, BrandMarkComponent],
  template: `
    <div class="auth-page">
      <section class="auth-page__brand">
        <svg class="schematic" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="600" height="600" fill="url(#grid)" opacity="0.4"/>
          <!-- Pipe network sketch -->
          <g stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6">
            <line x1="80"  y1="120" x2="520" y2="120"/>
            <line x1="80"  y1="240" x2="520" y2="240"/>
            <line x1="80"  y1="360" x2="520" y2="360"/>
            <line x1="80"  y1="480" x2="520" y2="480"/>
            <line x1="160" y1="80"  x2="160" y2="520"/>
            <line x1="300" y1="80"  x2="300" y2="520"/>
            <line x1="440" y1="80"  x2="440" y2="520"/>
          </g>
          <g fill="currentColor" opacity="0.5">
            <circle cx="160" cy="120" r="3"/><circle cx="300" cy="120" r="3"/><circle cx="440" cy="120" r="3"/>
            <circle cx="160" cy="240" r="3"/><circle cx="300" cy="240" r="3"/><circle cx="440" cy="240" r="3"/>
            <circle cx="160" cy="360" r="3"/><circle cx="300" cy="360" r="3"/><circle cx="440" cy="360" r="3"/>
            <circle cx="160" cy="480" r="3"/><circle cx="300" cy="480" r="3"/><circle cx="440" cy="480" r="3"/>
          </g>
        </svg>

        <div class="brand-content">
          <hf-brand-mark />
          <h1 class="headline">Hydraulic calculations, done right.</h1>
          <p class="subhead">
            NFPA-13 compliant fire sprinkler design with the precision of Elite Software Fire,
            built for the modern engineering workflow.
          </p>
          <ul class="features">
            <li><span class="material-symbols-outlined">check</span> Hazen-Williams network solver</li>
            <li><span class="material-symbols-outlined">check</span> 15-page PDF reports</li>
            <li><span class="material-symbols-outlined">check</span> US &amp; SI units</li>
          </ul>
        </div>
      </section>

      <section class="auth-page__panel">
        <div class="auth-card">
          <div class="auth-card__head">
            <h2>Sign in</h2>
            <p>Continue with your Google account to access your projects.</p>
          </div>

          @if (error()) {
            <div class="error-banner" role="alert">
              <span class="material-symbols-outlined">error</span>
              <span>{{ error() }}</span>
            </div>
          }

          <button
            type="button"
            class="google-btn"
            [disabled]="submitting()"
            (click)="signInWithGoogle()"
          >
            @if (submitting()) {
              <mat-progress-spinner diameter="18" mode="indeterminate" />
              <span>Signing in…</span>
            } @else {
              <svg class="g-icon" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
                <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#FBBC05" d="M3.88 10.78a5.4 5.4 0 0 1-.3-1.78c0-.62.11-1.22.29-1.78L.96 4.96A9.01 9.01 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
              </svg>
              <span>Continue with Google</span>
            }
          </button>

          <p class="legal">
            By signing in you agree to our terms of service and privacy policy.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .auth-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr;
      background: var(--hf-bg);
    }
    @media (min-width: 1024px) {
      .auth-page {
        grid-template-columns: 1.1fr 1fr;
      }
    }

    /* ---------- Brand panel ---------- */
    .auth-page__brand {
      position: relative;
      display: flex;
      align-items: center;
      padding: 64px;
      background: var(--hf-surface);
      border-right: 1px solid var(--hf-border);
      overflow: hidden;
      min-height: 280px;
    }
    @media (max-width: 1023px) {
      .auth-page__brand { padding: 40px 24px; }
    }
    .schematic {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      color: var(--hf-border-strong);
      pointer-events: none;
    }
    .brand-content {
      position: relative;
      z-index: 1;
      max-width: 480px;
    }
    .headline {
      margin: 32px 0 12px;
      font-size: 36px;
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--hf-text);
    }
    @media (max-width: 1023px) { .headline { font-size: 26px; } }
    .subhead {
      margin: 0 0 24px;
      color: var(--hf-text-muted);
      font-size: 15px;
      line-height: 1.55;
    }
    .features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .features li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--hf-text-muted);
    }
    .features .material-symbols-outlined {
      font-size: 16px;
      color: var(--hf-success);
    }

    /* ---------- Auth panel ---------- */
    .auth-page__panel {
      display: grid;
      place-items: center;
      padding: 48px 24px;
    }
    .auth-card {
      width: 100%;
      max-width: 380px;
      background: var(--hf-surface);
      border: 1px solid var(--hf-border);
      border-radius: var(--hf-radius-lg);
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .auth-card__head h2 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 600;
      color: var(--hf-text);
    }
    .auth-card__head p {
      margin: 0 0 24px;
      color: var(--hf-text-muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--hf-danger-soft);
      color: var(--hf-danger);
      padding: 10px 12px;
      border-radius: var(--hf-radius-sm);
      font-size: 13px;
      margin-bottom: 16px;
      border-left: 3px solid var(--hf-danger);
    }
    .error-banner .material-symbols-outlined { font-size: 16px; }

    .google-btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--hf-text);
      color: var(--hf-bg);
      border: 1px solid var(--hf-text);
      border-radius: var(--hf-radius-sm);
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity var(--hf-dur) var(--hf-ease);
    }
    .google-btn:hover:not(:disabled) { opacity: 0.9; }
    .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .g-icon { width: 18px; height: 18px; }

    .legal {
      margin: 16px 0 0;
      font-size: 11px;
      color: var(--hf-text-faint);
      text-align: center;
      line-height: 1.5;
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async signInWithGoogle(): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigateByUrl('/projects');
    } catch (e) {
      this.error.set(extractError(e));
    } finally {
      this.submitting.set(false);
    }
  }
}

function extractError(e: unknown): string {
  const msg = (e as { code?: string; message?: string })?.code ?? (e as Error)?.message ?? 'Sign-in failed';
  return msg.replace(/^auth\//, '').replace(/-/g, ' ');
}
