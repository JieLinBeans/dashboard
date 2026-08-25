import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { AttemptDetail } from '../../models/models';

@Component({
  selector: 'app-attempt-detail',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="attempt ? (attempt.trainee_name + ' / ' + attempt.module_name) : 'Attempt'"></app-page-header>
    <div class="content" *ngIf="attempt">
      <div class="grid" style="grid-template-columns: 2.2fr 1fr; align-items: start;">
        <div class="card">
          <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 14px;">
            <div class="card-title" style="margin: 0;">Performance Indicators and Levels</div>
            <div style="text-align:right;">
              <div class="muted" style="font-size: 11.5px; font-weight:700; text-transform:uppercase;">Performance Score</div>
              <div style="font-family: var(--font-display); font-weight:800; font-size: 22px;">
                {{ attempt.score ?? '—' }}<span *ngIf="attempt.score !== null" style="font-size:14px;">%</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>#</th><th>Performance Indicators</th><th>Measurement</th><th>Weight (%)</th><th>Score</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let pi of attempt.performance_indicators; let i = index">
                <td>{{ i + 1 }}</td>
                <td>{{ pi.name }}</td>
                <td>{{ pi.measurement }}</td>
                <td>{{ pi.weight }}</td>
                <td>{{ pi.score ?? '—' }}</td>
              </tr>
              <tr *ngIf="!attempt.performance_indicators.length">
                <td colspan="5" class="muted">No performance indicators recorded for this module yet.</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">Performance Report</div>
          <p style="font-size: 13.5px; line-height: 1.6;">{{ attempt.report?.content || 'No report generated for this attempt yet.' }}</p>
          <p *ngIf="attempt.report?.suggestions" style="white-space: pre-line; font-size: 13.5px; line-height: 1.6; margin-top: 10px;">{{ attempt.report?.suggestions }}</p>
        </div>

        <div style="display:flex; flex-direction: column; gap: 16px;">
          <div class="card">
            <div class="card-title">Past Attempts</div>
            <div *ngIf="attempt.past_attempts.length; else noPast">
              <div class="list-row" *ngFor="let p of attempt.past_attempts">
                <span>Attempt {{ p.attempt_number }}</span>
                <span class="badge" [class.badge-green]="p.status === 'completed'" [class.badge-red]="p.status === 'failed'" [class.badge-amber]="p.status === 'in_progress'">
                  {{ p.score !== null ? p.score + '%' : p.status }}
                </span>
              </div>
            </div>
            <ng-template #noPast><div class="empty-state">No previous attempts.</div></ng-template>
          </div>

          <div class="card">
            <div class="card-title">Evidence at a Glance / AI Explanation &amp; Recommended Enrichment</div>
            <p class="muted" style="font-size: 13px;">
              {{ attempt.report ? attempt.report.suggestions : 'Recommendations will appear here once a performance report has been generated.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="content" *ngIf="!attempt"><div class="spinner-row">Loading attempt…</div></div>
  `,
})
export class AttemptDetailComponent implements OnInit {
  attempt: AttemptDetail | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('attemptId'));
    this.api.getAttempt(id).subscribe((a) => (this.attempt = a));
  }
}
