import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { Module, Trainee } from '../../models/models';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Create Course"></app-page-header>
    <div class="content" style="max-width: 640px;">
      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <div class="field">
          <label>Course Name</label>
          <input type="text" formControlName="name" placeholder="e.g. Course 5" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea formControlName="description" placeholder="What this course covers"></textarea>
        </div>
        <div class="field">
          <label>Skills Learnt</label>
          <input type="text" formControlName="skills_learnt" placeholder="e.g. Defensive driving, hazard response" />
        </div>
        <div class="field">
          <label>Estimated Time Taken</label>
          <input type="text" formControlName="estimated_time" placeholder="e.g. 4 weeks" />
        </div>

        <div class="field">
          <label>Modules</label>
          <div class="chip-row">
            <span
              class="chip"
              *ngFor="let m of modules"
              [class.selected]="selectedModuleIds.has(m.id)"
              (click)="toggleModule(m.id)"
            >{{ m.name }}</span>
          </div>
          <div class="field-hint" *ngIf="!modules.length">No modules yet — create one first.</div>
        </div>

        <div class="field">
          <label>Trainees</label>
          <div class="chip-row">
            <span
              class="chip"
              *ngFor="let t of trainees"
              [class.selected]="selectedTraineeIds.has(t.id)"
              (click)="toggleTrainee(t.id)"
            >{{ t.name }}</span>
          </div>
          <div class="field-hint">Selecting trainees creates an initial "Batch 1" for this course.</div>
        </div>

        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || submitting" style="width: 100%; margin-top: 8px;">
          {{ submitting ? 'Creating…' : 'Create Course' }}
        </button>
      </form>
    </div>
  `,
})
export class CourseFormComponent implements OnInit {
  modules: Module[] = [];
  trainees: Trainee[] = [];
  selectedModuleIds = new Set<number>();
  selectedTraineeIds = new Set<number>();
  submitting = false;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    skills_learnt: [''],
    estimated_time: [''],
  });

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getModules().subscribe((m) => (this.modules = m));
    this.api.getTrainees().subscribe((t) => (this.trainees = t));
  }

  toggleModule(id: number) {
    this.selectedModuleIds.has(id) ? this.selectedModuleIds.delete(id) : this.selectedModuleIds.add(id);
  }

  toggleTrainee(id: number) {
    this.selectedTraineeIds.has(id) ? this.selectedTraineeIds.delete(id) : this.selectedTraineeIds.add(id);
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.api
      .createCourse({
        ...this.form.value,
        module_ids: Array.from(this.selectedModuleIds),
        trainee_ids: Array.from(this.selectedTraineeIds),
      })
      .subscribe({
        next: () => this.router.navigate(['/courses']),
        error: () => (this.submitting = false),
      });
  }
}
