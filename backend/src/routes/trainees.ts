import { FastifyInstance } from "fastify";
import { pool } from "../db";

export default async function traineesRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const result = await pool.query(`SELECT * FROM trainees ORDER BY id`);
    return result.rows;
  });

  app.post("/", async (req, reply) => {
    const body = req.body as { name: string; email?: string };
    const result = await pool.query(
      `INSERT INTO trainees (name, email) VALUES ($1, $2) RETURNING *`,
      [body.name, body.email || null]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`SELECT * FROM trainees WHERE id = $1`, [id]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Trainee not found" });
    return result.rows[0];
  });

  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; email?: string };
    const result = await pool.query(
      `UPDATE trainees SET name = COALESCE($2, name), email = COALESCE($3, email) WHERE id = $1 RETURNING *`,
      [id, body.name, body.email]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "Trainee not found" });
    return result.rows[0];
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`DELETE FROM trainees WHERE id = $1`, [id]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Trainee not found" });
    return reply.code(204).send();
  });

  // Trainee detail within a batch: overall stats, learning path, live event logs
  app.get("/:id/batches/:batchId", async (req, reply) => {
    const { id, batchId } = req.params as { id: string; batchId: string };

    const trainee = await pool.query(`SELECT * FROM trainees WHERE id = $1`, [id]);
    if (trainee.rowCount === 0) return reply.code(404).send({ error: "Trainee not found" });

    const batch = await pool.query(
      `SELECT b.*, c.name AS course_name, c.id AS course_id FROM batches b
       JOIN courses c ON c.id = b.course_id WHERE b.id = $1`,
      [batchId]
    );
    if (batch.rowCount === 0) return reply.code(404).send({ error: "Batch not found" });

    const attempts = await pool.query(
      `SELECT a.*, m.name AS module_name
       FROM module_attempts a
       JOIN modules m ON m.id = a.module_id
       JOIN course_modules cm ON cm.module_id = m.id AND cm.course_id = $3
       WHERE a.trainee_id = $1 AND a.batch_id = $2
       ORDER BY cm.sort_order, m.id`,
      [id, batchId, batch.rows[0].course_id]
    );

    const liveAttempt = attempts.rows.find((a) => a.is_live);
    let liveEvents: any[] = [];
    if (liveAttempt) {
      const events = await pool.query(
        `SELECT * FROM event_logs WHERE attempt_id = $1 ORDER BY created_at`,
        [liveAttempt.id]
      );
      liveEvents = events.rows;
    }

    const durations = attempts.rows.filter((a) => a.avg_time_per_session);
    const avgTimePerSession = durations.length > 0 ? durations[0].avg_time_per_session : null;

    return {
      trainee: trainee.rows[0],
      batch: batch.rows[0],
      stats: {
        avg_time_per_session: avgTimePerSession,
      },
      learning_path: attempts.rows.map((a) => ({
        attempt_id: a.id,
        module_id: a.module_id,
        module_name: a.module_name,
        attempt_number: a.attempt_number,
        max_attempts: a.max_attempts,
        status: a.status,
        score: a.score,
        is_live: a.is_live,
      })),
      live_attempt_id: liveAttempt ? liveAttempt.id : null,
      live_events: liveEvents,
    };
  });
}
