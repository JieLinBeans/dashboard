import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">&#128663;</div>
          <div class="sidebar-brand-text">LMS<span>Trainer Portal</span></div>
        </div>

        <nav class="nav-group">
          <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-icon">&#9679;&#9679;</span> Dashboard
          </a>
          <a class="nav-link" routerLink="/courses" routerLinkActive="active">
            <span class="nav-icon">&#128214;</span> Courses
          </a>
          <a class="nav-link" routerLink="/learners" routerLinkActive="active">
            <span class="nav-icon">&#128101;</span> Learners
          </a>
          <a class="nav-link" routerLink="/chat" routerLinkActive="active">
            <span class="nav-icon">&#128172;</span> Chat
          </a>
          <a class="nav-link" routerLink="/analytics" routerLinkActive="active">
            <span class="nav-icon">&#128202;</span> Analytics
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="avatar-circle">TX</div>
          <div class="sidebar-footer-text">
            <strong>Trainer X</strong>
            <span>Head Trainer</span>
          </div>
        </div>
      </aside>

      <div class="main">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class AppComponent {}
