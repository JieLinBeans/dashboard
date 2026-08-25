import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { EventLog, TraineeBatchDetail } from '../../models/models';

@Component({
  selector: 'app-trainee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="detail ? (detail.trainee.name + ' / ' + detail.batch.course_name + ' / ' + detail.batch.name) : 'Trainee'"
    ></app-page-header>
    <div class="content" *ngIf="detail">
      <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 18px;">
        <span class="dot" [class.dot-live]="!!detail.live_attempt_id" [class.dot-ok]="!detail.live_attempt_id"></span>
        <span class="muted" style="font-size: 13px;">{{ detail.live_attempt_id ? 'Live now' : 'Not currently active' }}</span>
      </div>

      <div class="grid" style="grid-template-columns: 2fr 1fr; align-items: start;">
        <div>
          <div class="card" style="margin-bottom: 16px;">
            <div class="card-title">Trainee Overall Stats</div>
            <div class="grid grid-3">
              <div class="card stat-card" style="border: none; box-shadow: none; padding: 8px 0;">
                <div class="stat-label">Average time per session</div>
                <div class="stat-value" style="font-size: 20px;">{{ detail.stats.avg_time_per_session || '—' }}</div>
              </div>
            </div>
          </div>

          <div class="card-title" style="margin-left: 4px;">Learning Path</div>
          <div class="card">
            <a
              class="list-row"
              *ngFor="let m of detail.learning_path"
              [routerLink]="['/attempts', m.attempt_id]"
              [style.opacity]="m.status === 'to_do' ? 0.5 : 1"
            >
              <span style="font-weight: 600; font-size: 13.5px;">{{ m.module_name }}</span>
              <div style="display:flex; align-items:center; gap: 16px;">
                <span class="muted" style="font-size: 12.5px;">Attempts: {{ m.attempt_number }}/{{ m.max_attempts }}</span>
                <span
                  class="badge"
                  [class.badge-green]="m.status === 'completed'"
                  [class.badge-amber]="m.status === 'in_progress'"
                  [class.badge-blue]="m.status === 'to_do'"
                  [class.badge-red]="m.status === 'failed'"
                >{{ statusLabel(m.status) }}</span>
                <span>&#8250;</span>
              </div>
            </a>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Live Event Logs</div>
          <div *ngIf="events.length; else noEvents">
            <div class="event-item" *ngFor="let e of events" [class.event-error]="e.is_error" [class.event-ok]="!e.is_error">
              <span>{{ e.is_error ? '&#10060;' : '&#9989;' }}</span>
              <span>{{ e.description }}</span>
            </div>
          </div>
          <ng-template #noEvents><div class="empty-state">No live session right now.</div></ng-template>
        </div>
      </div>
    </div>
    <div class="content" *ngIf="!detail"><div class="spinner-row">Loading trainee…</div></div>
  `,
})
export class TraineeDetailComponent implements OnInit, OnDestroy {
  detail: TraineeBatchDetail | null = null;
  events: EventLog[] = [];
  private socket: WebSocket | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const traineeId = Number(this.route.snapshot.paramMap.get('traineeId'));
    const batchId = Number(this.route.snapshot.paramMap.get('batchId'));

    this.api.getTraineeInBatch(traineeId, batchId).subscribe((d) => {
      this.detail = d;
      this.events = d.live_events;
      if (d.live_attempt_id) this.connectLive(d.live_attempt_id);
    });
  }

  ngOnDestroy() {
    this.socket?.close();
  }

  statusLabel(status: string): string {
    return { to_do: 'To Do', in_progress: 'In Progress', completed: 'Completed', failed: 'Failed' }[status] || status;
  }

  private connectLive(attemptId: number) {
    try {
      this.socket = this.api.liveSocket(attemptId);
      this.socket.onmessage = (msg) => {
        const payload = JSON.parse(msg.data);
        if (payload.type === 'event') this.events = [...this.events, payload.event];
      };
    } catch {
      // WebSocket not available (e.g. SSR) — live stream simply won't update.
    }
  }
}
