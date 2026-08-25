import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Chat"></app-page-header>
    <div class="content" style="display:flex; flex-direction:column; height: calc(100vh - 130px);">
      <div *ngIf="!messages.length" style="flex:1; display:flex; align-items:center; justify-content:center;">
        <h2 style="font-weight: 600; color: var(--ink-soft);">What would you like to know today?</h2>
      </div>

      <div #scrollArea *ngIf="messages.length" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap: 12px; padding: 4px 2px;">
        <div
          *ngFor="let m of messages"
          [style.align-self]="m.role === 'user' ? 'flex-end' : 'flex-start'"
          style="max-width: 65%;"
        >
          <div
            class="card"
            [style.background]="m.role === 'user' ? 'var(--ink)' : 'var(--surface)'"
            [style.color]="m.role === 'user' ? '#fff' : 'var(--ink)'"
            style="padding: 12px 16px; font-size: 13.5px; line-height: 1.5;"
          >
            {{ m.content }}
          </div>
        </div>
        <div class="spinner-row" *ngIf="sending">Thinking…</div>
      </div>

      <form (ngSubmit)="send()" style="display:flex; gap: 10px; margin-top: 16px;">
        <input
          type="text"
          [(ngModel)]="draft"
          name="draft"
          placeholder="Ask Anything"
          style="flex:1; border:1px solid var(--line); border-radius: 999px; padding: 12px 20px; font-size: 14px;"
        />
        <button class="btn btn-primary" type="submit" [disabled]="!draft.trim() || sending">Send</button>
      </form>
    </div>
  `,
})
export class ChatComponent implements OnInit {
  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;
  messages: ChatMessage[] = [];
  draft = '';
  sending = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getChatHistory().subscribe((h) => (this.messages = h));
  }

  send() {
    const text = this.draft.trim();
    if (!text) return;
    this.draft = '';
    this.messages = [...this.messages, { id: -1, role: 'user', content: text, created_at: new Date().toISOString() }];
    this.sending = true;
    this.api.sendChatMessage(text).subscribe({
      next: (reply) => {
        this.messages = [...this.messages, reply];
        this.sending = false;
      },
      error: () => (this.sending = false),
    });
  }
}
