import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { Module } from '../../models/models';

@Component({
  selector: 'app-module-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Create Module"></app-page-header>
    <div class="content" style="max-width: 640px;">
      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <div class="field">
          <label>Module Name</label>
          <input type="text" formControlName="name" placeholder="e.g. Module 5" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea formControlName="description" placeholder="What this module covers"></textarea>
        </div>
        <div class="field">
          <label>Pre-Requisite Modules</label>
          <div class="chip-row">
            <span
              class="chip"
              *ngFor="let m of existingModules"
              [class.selected]="selectedPrereqIds.has(m.id)"
              (click)="togglePrereq(m.id)"
            >{{ m.name }}</span>
          </div>
          <div class="field-hint" *ngIf="!existingModules.length">No other modules exist yet.</div>
        </div>
        <div class="field">
          <label>Skills Learnt</label>
          <input type="text" formControlName="skills_learnt" placeholder="e.g. Parallel parking" />
        </div>
        <div class="field">
          <label>Estimated Time Taken</label>
          <input type="text" formControlName="estimated_time" placeholder="e.g. 2 hours" />
        </div>

        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || submitting" style="width: 100%; margin-top: 8px;">
          {{ submitting ? 'Creating…' : 'Create Module' }}
        </button>
      </form>
    </div>
  `,
})
export class ModuleFormComponent implements OnInit {
  existingModules: Module[] = [];
  selectedPrereqIds = new Set<number>();
  submitting = false;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    skills_learnt: [''],
    estimated_time: [''],
  });

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getModules().subscribe((m) => (this.existingModules = m));
  }

  togglePrereq(id: number) {
    this.selectedPrereqIds.has(id) ? this.selectedPrereqIds.delete(id) : this.selectedPrereqIds.add(id);
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.api
      .createModule({
        ...this.form.value,
        prerequisite_module_ids: Array.from(this.selectedPrereqIds),
      })
      .subscribe({
        next: () => this.router.navigate(['/courses']),
        error: () => (this.submitting = false),
      });
  }
}
