import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { Batch, Course } from '../../models/models';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Courses"></app-page-header>
    <div class="content">
      <div style="display:flex; justify-content:flex-end; gap: 10px; margin-bottom: 20px;">
        <a class="btn btn-secondary" routerLink="/modules/new">+ New module</a>
        <a class="btn btn-primary" routerLink="/courses/new">+ New course</a>
      </div>

      <div class="section-title">Active batches</div>
      <div class="grid grid-3" *ngIf="activeBatches.length; else noneActive">
        <a class="card" *ngFor="let b of activeBatches" [routerLink]="['/batches', b.id]">
          <div class="card-title">{{ b.course_name }} / {{ b.name }}</div>
          <p class="muted">{{ b.start_date | date: 'd/M/yy' }} - {{ b.end_date | date: 'd/M/yy' }}</p>
        </a>
      </div>
      <ng-template #noneActive><div class="card empty-state">No active batches right now.</div></ng-template>

      <div class="section-title">Upcoming batches</div>
      <div class="grid grid-3" *ngIf="upcomingBatches.length; else noneUpcoming">
        <a class="card" *ngFor="let b of upcomingBatches" [routerLink]="['/batches', b.id]">
          <div class="card-title">{{ b.course_name }} / {{ b.name }}</div>
          <p class="muted">{{ b.start_date | date: 'd/M/yy' }} - {{ b.end_date | date: 'd/M/yy' }}</p>
        </a>
      </div>
      <ng-template #noneUpcoming><div class="card empty-state">No upcoming batches scheduled.</div></ng-template>

      <div class="section-title">Available courses</div>
      <div class="grid grid-4">
        <div class="card" *ngFor="let c of courses">
          <div class="card-title">{{ c.name }}</div>
          <p class="muted" style="margin-bottom: 10px;">{{ c.description }}</p>
          <div class="chip-row" *ngIf="c.estimated_time">
            <span class="chip">{{ c.estimated_time }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  batches: Batch[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCourses().subscribe((res) => {
      this.courses = res.courses;
      this.batches = res.batches;
    });
  }

  get activeBatches(): Batch[] {
    const today = new Date();
    return this.batches.filter((b) => {
      if (!b.start_date || !b.end_date) return false;
      return new Date(b.start_date) <= today && new Date(b.end_date) >= today;
    });
  }

  get upcomingBatches(): Batch[] {
    const today = new Date();
    return this.batches.filter((b) => b.start_date && new Date(b.start_date) > today);
  }
}
