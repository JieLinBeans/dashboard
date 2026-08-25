import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div>
        <h1>{{ title }}</h1>
        <div class="date">{{ today }}</div>
      </div>
      <div class="topbar-actions">
        <div class="search-box">&#128269; Search</div>
        <div style="font-size: 18px;">&#128276;</div>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
