export interface Course {
  id: number;
  name: string;
  description?: string;
  skills_learnt?: string;
  estimated_time?: string;
  modules?: Module[];
  prerequisites?: { id: number; name: string }[];
  batches?: Batch[];
}

export interface Module {
  id: number;
  name: string;
  description?: string;
  skills_learnt?: string;
  estimated_time?: string;
  prerequisites?: { id: number; name: string }[];
  performance_indicators?: PerformanceIndicator[];
}

export interface PerformanceIndicator {
  id: number;
  name: string;
  measurement?: string;
  weight?: number;
  score?: number | null;
}

export interface Batch {
  id: number;
  course_id: number;
  course_name?: string;
  name: string;
  start_date?: string;
  end_date?: string;
  trainee_count?: number;
}

export interface BatchDetail extends Batch {
  modules: { id: number; name: string; avg_progress: number; completed: boolean }[];
  trainees: { id: number; name: string; progress: number; status: 'live' | 'attention' | 'ok' }[];
}

export interface Trainee {
  id: number;
  name: string;
  email?: string;
}

export interface LearningPathItem {
  attempt_id: number;
  module_id: number;
  module_name: string;
  attempt_number: number;
  max_attempts: number;
  status: 'to_do' | 'in_progress' | 'completed' | 'failed';
  score: number | null;
  is_live: boolean;
}

export interface EventLog {
  id: number;
  attempt_id: number;
  event_type: string;
  description: string;
  is_error: boolean;
  created_at: string;
}

export interface TraineeBatchDetail {
  trainee: Trainee;
  batch: Batch;
  stats: { avg_time_per_session: string | null };
  learning_path: LearningPathItem[];
  live_attempt_id: number | null;
  live_events: EventLog[];
}

export interface AttemptDetail {
  id: number;
  trainee_id: number;
  trainee_name: string;
  module_id: number;
  module_name: string;
  batch_id: number;
  attempt_number: number;
  max_attempts: number;
  status: string;
  score: number | null;
  avg_time_per_session?: string;
  started_at?: string;
  completed_at?: string;
  performance_indicators: PerformanceIndicator[];
  past_attempts: { id: number; attempt_number: number; status: string; score: number | null }[];
  report: { content: string; suggestions: string } | null;
}

export interface DashboardStats {
  total_trainees: number;
  active_courses: number;
  completion_rate: number;
  avg_score: number;
  enrolment_by_category: { course_name: string; enrolled: string; completed: string }[];
  recent_activity: { description: string; is_error: boolean; created_at: string; trainee_name: string; module_name: string }[];
}

export interface ModuleAnalysis {
  module: Module;
  stats: { avg_score: number | null; pass_rate: number; attempt_count: number };
  report: { content: string; suggestions: string } | null;
}

export interface CohortAnalysis {
  batch: Batch;
  stats: {
    avg_score: number | null;
    pass_rate: number;
    hardest_module: { name: string; avg_score: number } | null;
    anomalous_trainees: { id: number; name: string; error_count: number }[];
  };
  report: { content: string; suggestions: string } | null;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
