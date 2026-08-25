import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Analytics"></app-page-header>
    <div class="content">
      <div class="section-title">Performance Trend</div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Performance Trend</div>
          <div style="font-size: 26px;">&#8599;</div>
          <p class="muted">10% increase in passing rates!</p>
        </div>
        <div class="card">
          <div class="card-title">Performance Trend</div>
          <div style="font-size: 26px;">&#8600;</div>
          <p class="muted">50% longer training times!!</p>
        </div>
      </div>

      <div class="section-title">Needs attention</div>
      <div class="grid grid-2" *ngIf="attention">
        <a
          class="card"
          *ngFor="let m of attention.modules"
          [routerLink]="['/analytics/modules', m.module_id]"
          [queryParams]="{ batchId: m.batch_id }"
        >
          <div style="display:flex; align-items:center; gap: 8px;">
            <span class="warning-icon">&#9888;</span>
            <div class="card-title" style="margin:0;">{{ m.module_name }}</div>
          </div>
          <p class="muted" style="margin-top: 8px;">{{ m.batch_name }} requires some attention</p>
        </a>
        <a class="card" *ngFor="let c of attention.cohorts" [routerLink]="['/analytics/cohorts', c.batch_id]">
          <div style="display:flex; align-items:center; gap: 8px;">
            <span class="warning-icon">&#9888;</span>
            <div class="card-title" style="margin:0;">{{ c.course_name }} / {{ c.batch_name }}</div>
          </div>
          <p class="muted" style="margin-top: 8px;">Cohort requires some attention</p>
        </a>
        <div class="card empty-state" *ngIf="!attention.modules.length && !attention.cohorts.length">
          Nothing flagged for attention right now.
        </div>
      </div>
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  attention: {
    modules: { module_id: number; module_name: string; batch_id: number; batch_name: string }[];
    cohorts: { batch_id: number; batch_name: string; course_name: string }[];
  } | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAttention().subscribe((a) => (this.attention = a));
  }
}
