import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects-list/projects-list.component').then(
            (m) => m.ProjectsListComponent,
          ),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./features/project-editor/project-editor.component').then(
            (m) => m.ProjectEditorComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
