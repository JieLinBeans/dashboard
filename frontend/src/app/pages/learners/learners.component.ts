import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { Batch } from '../../models/models';

@Component({
  selector: 'app-learners',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Learners"></app-page-header>
    <div class="content">
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">Enrolment &amp; Completions / By Category</div>
        <p class="muted">Open a batch below to see individual trainee progress and live sessions.</p>
      </div>

      <div class="section-title">Batches</div>
      <div class="grid grid-3" *ngIf="batches.length; else empty">
        <a class="card" *ngFor="let b of batches" [routerLink]="['/batches', b.id]">
          <div class="card-title">{{ b.course_name }} / {{ b.name }}</div>
          <p class="muted" style="margin-bottom: 10px;">{{ b.start_date | date: 'd/M/yy' }} - {{ b.end_date | date: 'd/M/yy' }}</p>
          <span class="badge badge-blue">{{ b.trainee_count }} trainees</span>
        </a>
      </div>
      <ng-template #empty><div class="card empty-state">No batches yet. Create a course with trainees to get started.</div></ng-template>
    </div>
  `,
})
export class LearnersComponent implements OnInit {
  batches: Batch[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe((b) => (this.batches = b));
  }
}
