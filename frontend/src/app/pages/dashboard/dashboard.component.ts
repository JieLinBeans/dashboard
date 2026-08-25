import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { DashboardStats } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Good Morning, Trainer X"></app-page-header>
    <div class="content" *ngIf="stats as s; else loading">
      <div class="grid grid-4">
        <div class="card stat-card">
          <div class="stat-label">Total Trainees</div>
          <div class="stat-value">{{ s.total_trainees }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Active Courses</div>
          <div class="stat-value">{{ s.active_courses }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Completion Rate</div>
          <div class="stat-value">{{ s.completion_rate }}%</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Avg Score</div>
          <div class="stat-value">{{ s.avg_score }}</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top: 16px; align-items: start;">
        <div class="card">
          <div class="card-title">Enrolment &amp; Completions / By Category</div>
          <table>
            <thead><tr><th>Course</th><th>Enrolled</th><th>Completed</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of s.enrolment_by_category">
                <td>{{ row.course_name }}</td>
                <td>{{ row.enrolled }}</td>
                <td>{{ row.completed }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-title">Recent Activity</div>
          <div *ngIf="s.recent_activity.length; else noActivity">
            <div class="event-item" *ngFor="let e of s.recent_activity" [class.event-error]="e.is_error" [class.event-ok]="!e.is_error">
              <span>{{ e.is_error ? '&#10060;' : '&#9989;' }}</span>
              <span>{{ e.trainee_name }} — {{ e.module_name }}: {{ e.description }}</span>
            </div>
          </div>
          <ng-template #noActivity><div class="empty-state">No recent activity yet.</div></ng-template>
        </div>
      </div>

      <div class="section-title">Quick links</div>
      <div class="grid grid-3">
        <a class="card" routerLink="/courses">
          <div class="card-title">Courses</div>
          <p class="muted">Manage active, upcoming and available courses.</p>
        </a>
        <a class="card" routerLink="/learners">
          <div class="card-title">Learners</div>
          <p class="muted">View batches and trainee progress.</p>
        </a>
        <a class="card" routerLink="/analytics">
          <div class="card-title">Analytics</div>
          <p class="muted">Modules and cohorts that need attention.</p>
        </a>
      </div>
    </div>
    <ng-template #loading><div class="content"><div class="spinner-row">Loading dashboard…</div></div></ng-template>
  `,
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboard().subscribe((s) => (this.stats = s));
  }
}
