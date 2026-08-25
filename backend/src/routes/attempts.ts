import { FastifyInstance } from "fastify";
import { pool } from "../db";
import { eventBus } from "../plugins/eventBus";

export default async function attemptsRoutes(app: FastifyInstance) {
  // Attempt detail: trainee, module, performance indicators + scores, report
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const attemptResult = await pool.query(
      `SELECT a.*, t.name AS trainee_name, m.name AS module_name
       FROM module_attempts a
       JOIN trainees t ON t.id = a.trainee_id
       JOIN modules m ON m.id = a.module_id
       WHERE a.id = $1`,
      [id]
    );
    if (attemptResult.rowCount === 0) return reply.code(404).send({ error: "Attempt not found" });
    const attempt = attemptResult.rows[0];

    const indicators = await pool.query(
      `SELECT pi.id, pi.name, pi.measurement, pi.weight, s.score
       FROM performance_indicators pi
       LEFT JOIN attempt_indicator_scores s ON s.indicator_id = pi.id AND s.attempt_id = $1
       WHERE pi.module_id = $2
       ORDER BY pi.id`,
      [id, attempt.module_id]
    );

    const pastAttempts = await pool.query(
      `SELECT id, attempt_number, status, score, started_at, completed_at
       FROM module_attempts
       WHERE trainee_id = $1 AND module_id = $2 AND id != $3
       ORDER BY attempt_number DESC`,
      [attempt.trainee_id, attempt.module_id, id]
    );

    const report = await pool.query(
      `SELECT content, suggestions FROM reports WHERE entity_type = 'module' AND entity_id = $1 AND batch_id = $2
       ORDER BY generated_at DESC LIMIT 1`,
      [attempt.module_id, attempt.batch_id]
    );

    return {
      ...attempt,
      performance_indicators: indicators.rows,
      past_attempts: pastAttempts.rows,
      report: report.rows[0] || null,
    };
  });

  app.post("/", async (req, reply) => {
    const body = req.body as {
      trainee_id: number;
      module_id: number;
      batch_id: number;
      max_attempts?: number;
    };
    const existing = await pool.query(
      `SELECT COUNT(*) FROM module_attempts WHERE trainee_id = $1 AND module_id = $2 AND batch_id = $3`,
      [body.trainee_id, body.module_id, body.batch_id]
    );
    const attemptNumber = Number(existing.rows[0].count) + 1;

    const result = await pool.query(
      `INSERT INTO module_attempts (trainee_id, module_id, batch_id, attempt_number, max_attempts, status, started_at, is_live)
       VALUES ($1, $2, $3, $4, $5, 'in_progress', now(), true) RETURNING *`,
      [body.trainee_id, body.module_id, body.batch_id, attemptNumber, body.max_attempts || 3]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { status?: string; score?: number; is_live?: boolean };
    const completedAt = body.status === "completed" || body.status === "failed" ? "now()" : "completed_at";
    const result = await pool.query(
      `UPDATE module_attempts SET
         status = COALESCE($2, status),
         score = COALESCE($3, score),
         is_live = COALESCE($4, is_live),
         completed_at = CASE WHEN $2 IN ('completed','failed') THEN now() ELSE completed_at END
       WHERE id = $1 RETURNING *`,
      [id, body.status, body.score, body.is_live]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "Attempt not found" });
    eventBus.emit(`attempt:${id}`, { type: "status", attempt: result.rows[0] });
    return result.rows[0];
  });

  app.get("/:id/events", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`SELECT * FROM event_logs WHERE attempt_id = $1 ORDER BY created_at`, [id]);
    return result.rows;
  });

  app.post("/:id/events", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { event_type: string; description: string; is_error?: boolean };
    const result = await pool.query(
      `INSERT INTO event_logs (attempt_id, event_type, description, is_error)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, body.event_type, body.description, body.is_error || false]
    );
    const event = result.rows[0];
    eventBus.emit(`attempt:${id}`, { type: "event", event });
    return reply.code(201).send(event);
  });

  // Live event log stream over WebSocket: ws://.../api/attempts/:id/live
  app.get("/:id/live", { websocket: true }, (socket, req) => {
    const { id } = req.params as { id: string };
    const channel = `attempt:${id}`;

    const listener = (payload: unknown) => {
      socket.send(JSON.stringify(payload));
    };
    eventBus.on(channel, listener);

    socket.on("close", () => {
      eventBus.off(channel, listener);
    });
  });
}
