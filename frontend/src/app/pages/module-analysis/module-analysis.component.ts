import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { ModuleAnalysis } from '../../models/models';

@Component({
  selector: 'app-module-analysis',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="data ? data.module.name : 'Module Analysis'"></app-page-header>
    <div class="content" *ngIf="data">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 16px;">
        <span class="warning-icon">&#9888;</span>
        <span class="muted" style="font-size: 13px;">Flagged for attention</span>
      </div>

      <div class="grid grid-2" style="align-items: start;">
        <div class="card">
          <div class="card-title">Module General Stats</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 2;">
            <li>Score: {{ data.stats.avg_score ?? '—' }}</li>
            <li>Pass rate: {{ data.stats.pass_rate }}%</li>
            <li>Attempts recorded: {{ data.stats.attempt_count }}</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Evidence at a Glance / AI Explanation &amp; Recommended Actions</div>
          <p style="font-size: 13.5px; white-space: pre-line;">{{ data.report?.suggestions || 'No recommendations generated yet.' }}</p>
        </div>
      </div>

      <div class="section-title">Module Report</div>
      <div class="card">
        <p style="font-size: 13.5px; line-height: 1.6;">{{ data.report?.content || 'No report generated for this module yet.' }}</p>
      </div>
    </div>
    <div class="content" *ngIf="!data"><div class="spinner-row">Loading module analysis…</div></div>
  `,
})
export class ModuleAnalysisComponent implements OnInit {
  data: ModuleAnalysis | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const moduleId = Number(this.route.snapshot.paramMap.get('moduleId'));
    const batchId = this.route.snapshot.queryParamMap.get('batchId');
    this.api.getModuleAnalysis(moduleId, batchId ? Number(batchId) : undefined).subscribe((d) => (this.data = d));
  }
}
