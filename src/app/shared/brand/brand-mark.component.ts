import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hf-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="brand" [class.brand--compact]="compact()">
      <svg class="flame" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M16 4c2.4 3.7 5.6 6.4 5.6 10.5 0 3.7-2.5 6.7-5.6 6.7s-5.6-3-5.6-6.7c0-1.8.6-3 1.3-4.2.5 1.5 1.4 2.1 2.3 2.1 1.3 0 1.5-1.4 1.5-2.6 0-2.2-1.3-3.6-1.3-5.8z"
          fill="var(--hf-danger)"
        />
        <path
          d="M16 26c-1.8 0-3.2-1.5-3.2-3.5 0-1.4.7-2.5 1.5-3.1.2.7.7 1.2 1.2 1.2.7 0 1-.6 1-1.5 0-.7-.3-1.4-.3-2 1.6 0 3 1.8 3 4.2.1 2.4-1.4 4.7-3.2 4.7z"
          fill="var(--hf-amber)"
        />
      </svg>
      @if (!compact()) {
        <span class="wordmark">
          <span class="wordmark__hilli">HILLI</span><span class="wordmark__fire">FIRE</span>
        </span>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }
    .flame {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .brand--compact .flame { width: 28px; height: 28px; }
    .wordmark {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      font-family: var(--hf-font-ui);
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.14em;
      line-height: 1;
    }
    .wordmark__hilli { color: var(--hf-text); }
    .wordmark__fire  { color: var(--hf-danger); }
  `],
})
export class BrandMarkComponent {
  readonly compact = input<boolean>(false);
}
