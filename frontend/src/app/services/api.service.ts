import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AttemptDetail,
  Batch,
  BatchDetail,
  ChatMessage,
  CohortAnalysis,
  Course,
  DashboardStats,
  EventLog,
  Module,
  ModuleAnalysis,
  Trainee,
  TraineeBatchDetail,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Courses
  getCourses(): Observable<{ courses: Course[]; batches: Batch[] }> {
    return this.http.get<{ courses: Course[]; batches: Batch[] }>(`${this.base}/courses`);
  }
  getCourse(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.base}/courses/${id}`);
  }
  createCourse(payload: any): Observable<Course> {
    return this.http.post<Course>(`${this.base}/courses`, payload);
  }

  // Modules
  getModules(): Observable<Module[]> {
    return this.http.get<Module[]>(`${this.base}/modules`);
  }
  getModule(id: number): Observable<Module> {
    
    return this.http.get<Module>(`${this.base}/modules/${id}`);
  }
  createModule(payload: any): Observable<Module> {
    return this.http.post<Module>(`${this.base}/modules`, payload);
  }

  // Trainees
  getTrainees(): Observable<Trainee[]> {
    return this.http.get<Trainee[]>(`${this.base}/trainees`);
  }
  createTrainee(payload: { name: string; email?: string }): Observable<Trainee> {
    return this.http.post<Trainee>(`${this.base}/trainees`, payload);
  }
  getTraineeInBatch(traineeId: number, batchId: number): Observable<TraineeBatchDetail> {
    return this.http.get<TraineeBatchDetail>(`${this.base}/trainees/${traineeId}/batches/${batchId}`);
  }

  // Batches
  getBatches(status?: 'active' | 'upcoming'): Observable<Batch[]> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<Batch[]>(`${this.base}/batches${q}`);
  }
  getBatch(id: number): Observable<BatchDetail> {
    return this.http.get<BatchDetail>(`${this.base}/batches/${id}`);
  }
  createBatch(payload: any): Observable<Batch> {
    return this.http.post<Batch>(`${this.base}/batches`, payload);
  }

  // Attempts
  getAttempt(id: number): Observable<AttemptDetail> {
    return this.http.get<AttemptDetail>(`${this.base}/attempts/${id}`);
  }
  getAttemptEvents(id: number): Observable<EventLog[]> {
    return this.http.get<EventLog[]>(`${this.base}/attempts/${id}/events`);
  }
  addAttemptEvent(id: number, payload: { event_type: string; description: string; is_error?: boolean }) {
    return this.http.post<EventLog>(`${this.base}/attempts/${id}/events`, payload);
  }
  liveSocket(attemptId: number): WebSocket {
    return new WebSocket(`${environment.wsUrl}/attempts/${attemptId}/live`);
  }

  // Analytics
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/analytics/dashboard`);
  }
  getAttention(): Observable<{
    modules: { module_id: number; module_name: string; batch_id: number; batch_name: string }[];
    cohorts: { batch_id: number; batch_name: string; course_name: string }[];
  }> {
    return this.http.get<any>(`${this.base}/analytics/attention`);
  }
  getModuleAnalysis(moduleId: number, batchId?: number): Observable<ModuleAnalysis> {
    const q = batchId ? `?batchId=${batchId}` : '';
    return this.http.get<ModuleAnalysis>(`${this.base}/analytics/modules/${moduleId}${q}`);
  }
  getCohortAnalysis(batchId: number): Observable<CohortAnalysis> {
    return this.http.get<CohortAnalysis>(`${this.base}/analytics/cohorts/${batchId}`);
  }

  // Chat
  getChatHistory(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/chat/history`);
  }
  sendChatMessage(message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/chat`, { message });
  }
}
