-- LMS Trainer Portal - initial schema

CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Trainer',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skills_learnt TEXT,
  estimated_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skills_learnt TEXT,
  estimated_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS module_prerequisites (
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  prerequisite_module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (module_id, prerequisite_module_id)
);

CREATE TABLE IF NOT EXISTS course_modules (
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (course_id, module_id)
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_trainees (
  batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  trainee_id INT NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, trainee_id)
);

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('to_do','in_progress','completed','failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS module_attempts (
  id SERIAL PRIMARY KEY,
  trainee_id INT NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  attempt_number INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  status attempt_status DEFAULT 'to_do',
  score NUMERIC,
  avg_time_per_session TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_indicators (
  id SERIAL PRIMARY KEY,
  module_id INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  measurement TEXT,
  weight NUMERIC
);

CREATE TABLE IF NOT EXISTS attempt_indicator_scores (
  attempt_id INT NOT NULL REFERENCES module_attempts(id) ON DELETE CASCADE,
  indicator_id INT NOT NULL REFERENCES performance_indicators(id) ON DELETE CASCADE,
  score NUMERIC,
  PRIMARY KEY (attempt_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS event_logs (
  id SERIAL PRIMARY KEY,
  attempt_id INT NOT NULL REFERENCES module_attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  is_error BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'module' | 'cohort' | 'trainee_module'
  entity_id INT NOT NULL,
  batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
  content TEXT,
  suggestions TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  trainer_id INT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_trainee ON module_attempts(trainee_id);
CREATE INDEX IF NOT EXISTS idx_attempts_module ON module_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_attempts_batch ON module_attempts(batch_id);
CREATE INDEX IF NOT EXISTS idx_events_attempt ON event_logs(attempt_id);
