import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-new-project-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>New project</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Project title</mat-label>
          <input matInput formControlName="title" required autofocus />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        Create
      </button>
    </mat-dialog-actions>
  `,
})
export class NewProjectDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly ref = inject(MatDialogRef<NewProjectDialogComponent>);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.controls.title.value);
  }
}
