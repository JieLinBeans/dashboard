-- Seed data reflecting the wireframe (Course 1/Batch 10, Trainees 1-12, Modules 1-4, etc.)

INSERT INTO trainers (name, email, role) VALUES
  ('Trainer X', 'trainer.x@example.com', 'Head Trainer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO trainees (name, email) VALUES
  ('Trainee 1', 'trainee1@example.com'),
  ('Trainee 2', 'trainee2@example.com'),
  ('Trainee 3', 'trainee3@example.com'),
  ('Trainee 4', 'trainee4@example.com'),
  ('Trainee 5', 'trainee5@example.com'),
  ('Trainee 6', 'trainee6@example.com'),
  ('Trainee 7', 'trainee7@example.com'),
  ('Trainee 8', 'trainee8@example.com'),
  ('Trainee 9', 'trainee9@example.com'),
  ('Trainee 10', 'trainee10@example.com'),
  ('Trainee 11', 'trainee11@example.com'),
  ('Trainee 12', 'trainee12@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO courses (name, description, skills_learnt, estimated_time) VALUES
  ('Course 1', 'Foundational vehicle handling and safety course.', 'Vehicle control, hazard awareness', '4 weeks'),
  ('Course 2', 'Intermediate driving techniques.', 'Defensive driving, maneuvering', '4 weeks'),
  ('Course 3', 'Advanced certification course.', 'Advanced control, emergency response', '4 weeks'),
  ('Course 4', 'Specialist refresher course.', 'Refresher skills', '2 weeks');

INSERT INTO modules (name, description, skills_learnt, estimated_time) VALUES
  ('Module 1', 'Introduction to pre-drive checks.', 'Vehicle inspection', '2 hours'),
  ('Module 2', 'Basic maneuvering and control.', 'Steering, braking', '2 hours'),
  ('Module 3', 'Hazard perception and response.', 'Hazard perception', '3 hours'),
  ('Module 4', 'Parking and precision maneuvers.', 'Parking, spatial awareness', '3 hours');

INSERT INTO course_modules (course_id, module_id, sort_order)
SELECT c.id, m.id, m.id
FROM courses c, modules m
WHERE c.name = 'Course 1' AND m.name IN ('Module 1','Module 2','Module 3','Module 4');

INSERT INTO module_prerequisites (module_id, prerequisite_module_id)
SELECT m2.id, m1.id FROM modules m1, modules m2 WHERE m1.name = 'Module 1' AND m2.name = 'Module 2'
UNION ALL
SELECT m2.id, m1.id FROM modules m1, modules m2 WHERE m1.name = 'Module 2' AND m2.name = 'Module 3'
UNION ALL
SELECT m2.id, m1.id FROM modules m1, modules m2 WHERE m1.name = 'Module 3' AND m2.name = 'Module 4';

INSERT INTO batches (course_id, name, start_date, end_date)
SELECT id, 'Batch 10', DATE '2026-08-09', DATE '2026-08-31' FROM courses WHERE name = 'Course 1'
UNION ALL
SELECT id, 'Batch 1', DATE '2026-08-09', DATE '2026-08-31' FROM courses WHERE name = 'Course 2'
UNION ALL
SELECT id, 'Batch 1', DATE '2026-08-09', DATE '2026-08-31' FROM courses WHERE name = 'Course 3';

INSERT INTO batch_trainees (batch_id, trainee_id)
SELECT b.id, t.id
FROM batches b
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
CROSS JOIN trainees t;

-- Module attempts for Trainee 1..12 in Course 1 / Batch 10
INSERT INTO module_attempts (trainee_id, module_id, batch_id, attempt_number, max_attempts, status, score, avg_time_per_session, started_at, completed_at, is_live)
SELECT t.id, m.id, b.id, 3, 3, 'completed', 82, '18 min',
       now() - interval '10 days', now() - interval '9 days', false
FROM trainees t
JOIN batch_trainees bt ON bt.trainee_id = t.id
JOIN batches b ON b.id = bt.batch_id
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
JOIN modules m ON m.name = 'Module 1';

INSERT INTO module_attempts (trainee_id, module_id, batch_id, attempt_number, max_attempts, status, score, avg_time_per_session, started_at, completed_at, is_live)
SELECT t.id, m.id, b.id, 1, 3, 'completed', 88, '15 min',
       now() - interval '7 days', now() - interval '6 days', false
FROM trainees t
JOIN batch_trainees bt ON bt.trainee_id = t.id
JOIN batches b ON b.id = bt.batch_id
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
JOIN modules m ON m.name = 'Module 2';

INSERT INTO module_attempts (trainee_id, module_id, batch_id, attempt_number, max_attempts, status, score, avg_time_per_session, started_at, completed_at, is_live)
SELECT t.id, m.id, b.id, 1, 3, 'in_progress', NULL, '22 min',
       now() - interval '20 minutes', NULL, (t.name = 'Trainee 1')
FROM trainees t
JOIN batch_trainees bt ON bt.trainee_id = t.id
JOIN batches b ON b.id = bt.batch_id
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
JOIN modules m ON m.name = 'Module 3'
WHERE t.name IN ('Trainee 1','Trainee 2','Trainee 3','Trainee 4','Trainee 5','Trainee 6','Trainee 7','Trainee 8','Trainee 9','Trainee 10','Trainee 11','Trainee 12');

INSERT INTO module_attempts (trainee_id, module_id, batch_id, attempt_number, max_attempts, status, score, started_at, completed_at, is_live)
SELECT t.id, m.id, b.id, 0, 3, 'to_do', NULL, NULL, NULL, false
FROM trainees t
JOIN batch_trainees bt ON bt.trainee_id = t.id
JOIN batches b ON b.id = bt.batch_id
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
JOIN modules m ON m.name = 'Module 4';

-- Performance indicators for Module 1 (matches wireframe page 2 table)
INSERT INTO performance_indicators (module_id, name, measurement, weight)
SELECT m.id, x.name, x.measurement, x.weight FROM modules m,
(VALUES
  ('Task Completion', '% of steps completed', 20),
  ('Procedure Sequence Accuracy', 'Adherence to sequence', 10),
  ('Task Duration', 'Total time to complete task', 10),
  ('Incorrect Actions', 'Count of incorrect actions', 10),
  ('Steps Skipped', 'Count of steps skipped', 10),
  ('Tool Selection Efficiency', 'Correct tools selected on first attempt', 10),
  ('Critical Safety Errors', 'Count of critical safety violations', 30)
) AS x(name, measurement, weight)
WHERE m.name = 'Module 1';

-- Indicator scores for Trainee 1 / Module 1 (matches wireframe page 2: 65% overall)
INSERT INTO attempt_indicator_scores (attempt_id, indicator_id, score)
SELECT a.id, pi.id, v.score
FROM module_attempts a
JOIN trainees t ON t.id = a.trainee_id AND t.name = 'Trainee 1'
JOIN modules m ON m.id = a.module_id AND m.name = 'Module 1'
JOIN performance_indicators pi ON pi.module_id = m.id
JOIN (VALUES
  ('Task Completion', 15),
  ('Procedure Sequence Accuracy', 10),
  ('Task Duration', 10),
  ('Incorrect Actions', 10),
  ('Steps Skipped', 10),
  ('Tool Selection Efficiency', 10),
  ('Critical Safety Errors', 10)
) AS v(name, score) ON v.name = pi.name;

UPDATE module_attempts a SET score = 65
FROM trainees t, modules m
WHERE a.trainee_id = t.id AND t.name = 'Trainee 1'
  AND a.module_id = m.id AND m.name = 'Module 1';

-- Live event logs for Trainee 1 / Module 3 attempt (matches wireframe page 3)
INSERT INTO event_logs (attempt_id, event_type, description, is_error)
SELECT a.id, x.event_type, x.description, x.is_error
FROM module_attempts a
JOIN trainees t ON t.id = a.trainee_id AND t.name = 'Trainee 1'
JOIN modules m ON m.id = a.module_id AND m.name = 'Module 3'
JOIN (VALUES
  ('step_complete', 'Step 1 complete', false),
  ('step_skipped', 'Step 2 skipped', true),
  ('step_wrong', 'Step 3 done wrongly', true),
  ('step_complete', 'Step 2 complete', false),
  ('step_slow', 'Step 2 took > 15s to complete', true),
  ('critical_error', 'Step 4 - Critical Error', true),
  ('unsafe_behaviour', 'Step 5 - Unsafe behaviour detected', false)
) AS x(event_type, description, is_error) ON true;

-- Reports (module 1 analysis + cohort/batch 10 analysis)
INSERT INTO reports (entity_type, entity_id, batch_id, content, suggestions)
SELECT 'module', m.id, b.id,
 'Trainees in this module are averaging 65% on their first attempt, with the majority of points lost on Critical Safety Errors and Task Completion. Time-to-complete has increased 50% versus the previous cohort, suggesting the current instructions may be unclear or the task has become more difficult without an accompanying change in guidance.',
 '1) Review and simplify the pre-drive checklist instructions.
2) Add a short refresher video before the module starts.
3) Flag trainees with 2+ critical safety errors for 1:1 coaching.'
FROM modules m, batches b
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10'
WHERE m.name = 'Module 1';

INSERT INTO reports (entity_type, entity_id, batch_id, content, suggestions)
SELECT 'cohort', b.id, b.id,
 'Batch 10 is showing a wider spread of scores than average, with several trainees flagged for repeated critical safety errors in Module 1 and slower-than-expected completion times in Module 3. Overall pass rate remains above target, but the increase in training time this cohort warrants attention.',
 'Consider reducing the size of the cohort, or splitting Module 3 into two shorter sessions to reduce fatigue-related errors.'
FROM batches b
JOIN courses c ON c.id = b.course_id AND c.name = 'Course 1' AND b.name = 'Batch 10';
