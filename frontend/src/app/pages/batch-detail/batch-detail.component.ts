import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { BatchDetail } from '../../models/models';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header [title]="batch ? (batch.course_name + ' / ' + batch.name) : 'Batch'"></app-page-header>
    <div class="content" *ngIf="batch">
      <div class="section-title">Modules</div>
      <div class="grid grid-4">
        <div class="card" *ngFor="let m of batch.modules">
          <div class="card-title">{{ m.name }}</div>
          <div class="progress-track" style="margin-top: 10px;">
            <div class="progress-fill accent" [style.width.%]="m.avg_progress"></div>
          </div>
          <p class="muted" style="margin-top: 8px; font-size: 12px;">{{ m.avg_progress }}% average progress</p>
        </div>
      </div>

      <div class="section-title">Trainees</div>
      <div class="card">
        <div class="list-row" *ngFor="let t of batch.trainees">
          <a [routerLink]="['/batches', batch.id, 'trainees', t.id]" style="display:flex; align-items:center; gap: 12px; flex: 1;">
            <div class="avatar-circle" style="width:30px;height:30px;font-size:11px;">{{ initials(t.name) }}</div>
            <span style="font-weight: 600; font-size: 13.5px;">{{ t.name }}</span>
          </a>
          <div style="display:flex; align-items:center; gap: 14px; flex: 1; max-width: 260px;">
            <div class="progress-track" style="flex:1;">
              <div class="progress-fill" [style.width.%]="t.progress"></div>
            </div>
            <span
              class="dot"
              [class.dot-live]="t.status === 'live'"
              [class.dot-ok]="t.status === 'ok'"
              [class.dot-attention]="t.status === 'attention'"
              [title]="t.status"
            ></span>
          </div>
        </div>
        <div class="empty-state" *ngIf="!batch.trainees.length">No trainees assigned to this batch yet.</div>
      </div>
    </div>
    <div class="content" *ngIf="!batch"><div class="spinner-row">Loading batch…</div></div>
  `,
})
export class BatchDetailComponent implements OnInit {
  batch: BatchDetail | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const batchId = Number(this.route.snapshot.paramMap.get('batchId'));
    this.api.getBatch(batchId).subscribe((b) => (this.batch = b));
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
