import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses/courses.component').then((m) => m.CoursesComponent),
  },
  {
    path: 'courses/new',
    loadComponent: () => import('./pages/course-form/course-form.component').then((m) => m.CourseFormComponent),
  },
  {
    path: 'modules/new',
    loadComponent: () => import('./pages/module-form/module-form.component').then((m) => m.ModuleFormComponent),
  },
  {
    path: 'batches/:batchId',
    loadComponent: () => import('./pages/batch-detail/batch-detail.component').then((m) => m.BatchDetailComponent),
  },
  {
    path: 'learners',
    loadComponent: () => import('./pages/learners/learners.component').then((m) => m.LearnersComponent),
  },
  {
    path: 'batches/:batchId/trainees/:traineeId',
    loadComponent: () =>
      import('./pages/trainee-detail/trainee-detail.component').then((m) => m.TraineeDetailComponent),
  },
  {
    path: 'attempts/:attemptId',
    loadComponent: () =>
      import('./pages/attempt-detail/attempt-detail.component').then((m) => m.AttemptDetailComponent),
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: 'analytics/modules/:moduleId',
    loadComponent: () =>
      import('./pages/module-analysis/module-analysis.component').then((m) => m.ModuleAnalysisComponent),
  },
  {
    path: 'analytics/cohorts/:batchId',
    loadComponent: () =>
      import('./pages/cohort-analysis/cohort-analysis.component').then((m) => m.CohortAnalysisComponent),
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent),
  },
  { path: '**', redirectTo: '' },
];
