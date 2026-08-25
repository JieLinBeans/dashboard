 import { FastifyInstance } from "fastify";
import { pool } from "../db";

export default async function analyticsRoutes(app: FastifyInstance) {
  // Dashboard home page stats
  app.get("/dashboard", async () => {
    const totalTrainees = await pool.query(`SELECT COUNT(*) FROM trainees`);
    const activeCourses = await pool.query(
      `SELECT COUNT(DISTINCT course_id) FROM batches WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`
    );
    const completion = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) AS total
       FROM module_attempts`
    );
    const avgScore = await pool.query(
      `SELECT ROUND(AVG(score)) AS avg_score FROM module_attempts WHERE score IS NOT NULL`
    );
    const byCategory = await pool.query(
      `SELECT c.name AS course_name,
         COUNT(DISTINCT bt.trainee_id) AS enrolled,
         COUNT(DISTINCT a.trainee_id) FILTER (WHERE a.status = 'completed') AS completed
       FROM courses c
       LEFT JOIN batches b ON b.course_id = c.id
       LEFT JOIN batch_trainees bt ON bt.batch_id = b.id
       LEFT JOIN module_attempts a ON a.batch_id = b.id AND a.status = 'completed'
       GROUP BY c.id, c.name
       ORDER BY c.id`
    );
    const recentActivity = await pool.query(
      `SELECT el.description, el.is_error, el.created_at, t.name AS trainee_name, m.name AS module_name
       FROM event_logs el
       JOIN module_attempts a ON a.id = el.attempt_id
       JOIN trainees t ON t.id = a.trainee_id
       JOIN modules m ON m.id = a.module_id
       ORDER BY el.created_at DESC
       LIMIT 10`
    );
    const total = Number(completion.rows[0].total) || 1;
    const completed = Number(completion.rows[0].completed) || 0;

    return {
      total_trainees: Number(totalTrainees.rows[0].count),
      active_courses: Number(activeCourses.rows[0].count),
      completion_rate: Math.round((completed / total) * 100),
      avg_score: Number(avgScore.rows[0].avg_score) || 0,
      enrolment_by_category: byCategory.rows,
      recent_activity: recentActivity.rows,
    };
  });

  // Thumbnails for the Analytics landing page: modules/cohorts flagged for attention
  app.get("/attention", async () => {
    const modules = await pool.query(
      `SELECT DISTINCT r.entity_id AS module_id, m.name AS module_name, r.batch_id, b.name AS batch_name
       FROM reports r
       JOIN modules m ON m.id = r.entity_id AND r.entity_type = 'module'
       JOIN batches b ON b.id = r.batch_id`
    );
    const cohorts = await pool.query(
      `SELECT DISTINCT r.batch_id, b.name AS batch_name, c.name AS course_name
       FROM reports r
       JOIN batches b ON b.id = r.batch_id AND r.entity_type = 'cohort'
       JOIN courses c ON c.id = b.course_id`
    );
    return { modules: modules.rows, cohorts: cohorts.rows };
  });

  // In-depth module analysis (optionally scoped to a batch)
  app.get("/modules/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { batchId } = req.query as { batchId?: string };

    const module = await pool.query(`SELECT * FROM modules WHERE id = $1`, [id]);
    if (module.rowCount === 0) return reply.code(404).send({ error: "Module not found" });

    const statsQuery = batchId
      ? { text: `SELECT * FROM module_attempts WHERE module_id = $1 AND batch_id = $2`, values: [id, batchId] }
      : { text: `SELECT * FROM module_attempts WHERE module_id = $1`, values: [id] };
    const attempts = await pool.query(statsQuery.text, statsQuery.values);

    const scored = attempts.rows.filter((a) => a.score !== null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + Number(a.score), 0) / scored.length) : null;
    const completed = attempts.rows.filter((a) => a.status === "completed").length;
    const passRate = attempts.rows.length ? Math.round((completed / attempts.rows.length) * 100) : 0;

    const report = await pool.query(
      `SELECT content, suggestions FROM reports WHERE entity_type = 'module' AND entity_id = $1 ${
        batchId ? "AND batch_id = $2" : ""
      } ORDER BY generated_at DESC LIMIT 1`,
      batchId ? [id, batchId] : [id]
    );

    return {
      module: module.rows[0],
      stats: {
        avg_score: avgScore,
        pass_rate: passRate,
        attempt_count: attempts.rows.length,
      },
      report: report.rows[0] || null,
    };
  });

  // In-depth cohort (batch) analysis
  app.get("/cohorts/:batchId", async (req, reply) => {
    const { batchId } = req.params as { batchId: string };

    const batch = await pool.query(
      `SELECT b.*, c.name AS course_name FROM batches b JOIN courses c ON c.id = b.course_id WHERE b.id = $1`,
      [batchId]
    );
    if (batch.rowCount === 0) return reply.code(404).send({ error: "Batch not found" });

    const attempts = await pool.query(`SELECT * FROM module_attempts WHERE batch_id = $1`, [batchId]);
    const scored = attempts.rows.filter((a) => a.score !== null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + Number(a.score), 0) / scored.length) : null;
    const completed = attempts.rows.filter((a) => a.status === "completed").length;
    const passRate = attempts.rows.length ? Math.round((completed / attempts.rows.length) * 100) : 0;

    const hardestModule = await pool.query(
      `SELECT m.name, ROUND(AVG(a.score)) AS avg_score
       FROM module_attempts a JOIN modules m ON m.id = a.module_id
       WHERE a.batch_id = $1 AND a.score IS NOT NULL
       GROUP BY m.name ORDER BY avg_score ASC LIMIT 1`,
      [batchId]
    );

    const anomalies = await pool.query(
      `SELECT t.id, t.name, COUNT(el.id) AS error_count
       FROM trainees t
       JOIN module_attempts a ON a.trainee_id = t.id AND a.batch_id = $1
       JOIN event_logs el ON el.attempt_id = a.id AND el.is_error
       GROUP BY t.id, t.name
       HAVING COUNT(el.id) > 0
       ORDER BY error_count DESC
       LIMIT 5`,
      [batchId]
    );

    const report = await pool.query(
      `SELECT content, suggestions FROM reports WHERE entity_type = 'cohort' AND batch_id = $1
       ORDER BY generated_at DESC LIMIT 1`,
      [batchId]
    );

    return {
      batch: batch.rows[0],
      stats: {
        avg_score: avgScore,
        pass_rate: passRate,
        hardest_module: hardestModule.rows[0] || null,
        anomalous_trainees: anomalies.rows,
      },
      report: report.rows[0] || null,
    };
  });
}
