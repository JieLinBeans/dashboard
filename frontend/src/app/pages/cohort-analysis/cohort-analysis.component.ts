import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { CohortAnalysis } from '../../models/models';

@Component({
  selector: 'app-cohort-analysis',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="data ? (data.batch.course_name + ' / ' + data.batch.name) : 'Cohort Analysis'"></app-page-header>
    <div class="content" *ngIf="data">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 16px;">
        <span class="warning-icon">&#9888;</span>
        <span class="muted" style="font-size: 13px;">Flagged for attention</span>
      </div>

      <div class="grid grid-2" style="align-items: start;">
        <div class="card">
          <div class="card-title">Cohort General Stats</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 2;">
            <li>Average score: {{ data.stats.avg_score ?? '—' }}</li>
            <li>Pass rate: {{ data.stats.pass_rate }}%</li>
            <li>Which module was difficult for them: {{ data.stats.hardest_module?.name || '—' }}</li>
            <li>Anomalies — problematic trainees: {{ data.stats.anomalous_trainees.length }}</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Evidence at a Glance / AI Explanation &amp; Recommended Actions</div>
          <p style="font-size: 13.5px; white-space: pre-line;">{{ data.report?.suggestions || 'No recommendations generated yet.' }}</p>
        </div>
      </div>

      <div class="section-title">Anomalous trainees</div>
      <div class="card">
        <div class="list-row" *ngFor="let t of data.stats.anomalous_trainees">
          <span>{{ t.name }}</span>
          <span class="badge badge-red">{{ t.error_count }} flagged events</span>
        </div>
        <div class="empty-state" *ngIf="!data.stats.anomalous_trainees.length">No anomalies detected.</div>
      </div>

      <div class="section-title">Performance Report</div>
      <div class="card">
        <p style="font-size: 13.5px; line-height: 1.6;">{{ data.report?.content || 'No report generated for this cohort yet.' }}</p>
      </div>
    </div>
    <div class="content" *ngIf="!data"><div class="spinner-row">Loading cohort analysis…</div></div>
  `,
})
export class CohortAnalysisComponent implements OnInit {
  data: CohortAnalysis | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const batchId = Number(this.route.snapshot.paramMap.get('batchId'));
    this.api.getCohortAnalysis(batchId).subscribe((d) => (this.data = d));
  }
}
