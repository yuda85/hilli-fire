import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snack = inject(MatSnackBar);

  info(message: string, duration = 3500): void {
    this.snack.open(message, 'Dismiss', { duration, panelClass: 'toast-info' });
  }

  error(message: string, duration = 6000): void {
    this.snack.open(message, 'Dismiss', { duration, panelClass: 'toast-error' });
  }

  success(message: string, duration = 2500): void {
    this.snack.open(message, undefined, { duration, panelClass: 'toast-success' });
  }
}
