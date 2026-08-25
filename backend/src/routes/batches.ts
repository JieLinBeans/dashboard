import { FastifyInstance } from "fastify";
import { pool } from "../db";

export default async function batchesRoutes(app: FastifyInstance) {
  // List batches, optionally filtered by status=active|upcoming
  app.get("/", async (req) => {
    const { status } = req.query as { status?: string };
    let where = "";
    if (status === "active") where = "WHERE b.start_date <= CURRENT_DATE AND b.end_date >= CURRENT_DATE";
    if (status === "upcoming") where = "WHERE b.start_date > CURRENT_DATE";

    const result = await pool.query(`
      SELECT b.*, c.name AS course_name,
        (SELECT COUNT(*) FROM batch_trainees bt WHERE bt.batch_id = b.id) AS trainee_count
      FROM batches b
      JOIN courses c ON c.id = b.course_id
      ${where}
      ORDER BY b.start_date NULLS LAST, b.id
    `);
    return result.rows;
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const batchResult = await pool.query(
      `SELECT b.*, c.name AS course_name, c.id AS course_id
       FROM batches b JOIN courses c ON c.id = b.course_id WHERE b.id = $1`,
      [id]
    );
    if (batchResult.rowCount === 0) return reply.code(404).send({ error: "Batch not found" });
    const batch = batchResult.rows[0];

    const modules = await pool.query(
      `SELECT m.id, m.name,
         COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed_count,
         COUNT(a.id) AS attempt_count,
         COALESCE(ROUND(AVG(CASE WHEN a.status = 'completed' THEN 100
                                 WHEN a.status = 'in_progress' THEN 50
                                 ELSE 0 END)), 0) AS avg_progress
       FROM modules m
       JOIN course_modules cm ON cm.module_id = m.id AND cm.course_id = $2
       LEFT JOIN module_attempts a ON a.module_id = m.id AND a.batch_id = $1
       GROUP BY m.id, m.name
       ORDER BY m.id`,
      [id, batch.course_id]
    );

    const trainees = await pool.query(
      `SELECT t.id, t.name,
         COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed_modules,
         (SELECT COUNT(*) FROM course_modules cm WHERE cm.course_id = $2) AS total_modules,
         BOOL_OR(a.is_live) AS is_live,
         BOOL_OR(a.status = 'completed' AND a.score < 70) AS needs_attention,
         BOOL_OR(EXISTS (SELECT 1 FROM event_logs el WHERE el.attempt_id = a.id AND el.is_error)) AS has_errors
       FROM trainees t
       JOIN batch_trainees bt ON bt.trainee_id = t.id AND bt.batch_id = $1
       LEFT JOIN module_attempts a ON a.trainee_id = t.id AND a.batch_id = $1
       GROUP BY t.id, t.name
       ORDER BY t.id`,
      [id, batch.course_id]
    );

    return {
      ...batch,
      modules: modules.rows.map((m) => ({
        id: m.id,
        name: m.name,
        avg_progress: Number(m.avg_progress),
        completed: Number(m.completed_count) > 0 && Number(m.completed_count) === Number(m.attempt_count) && Number(m.attempt_count) > 0,
      })),
      trainees: trainees.rows.map((t) => {
        const total = Number(t.total_modules) || 1;
        const completed = Number(t.completed_modules) || 0;
        const status = t.is_live ? "live" : t.needs_attention || t.has_errors ? "attention" : "ok";
        return {
          id: t.id,
          name: t.name,
          progress: Math.round((completed / total) * 100),
          status,
        };
      }),
    };
  });

  app.post("/", async (req, reply) => {
    const body = req.body as {
      course_id: number;
      name: string;
      start_date?: string;
      end_date?: string;
      trainee_ids?: number[];
    };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO batches (course_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *`,
        [body.course_id, body.name, body.start_date || null, body.end_date || null]
      );
      const batch = result.rows[0];
      for (const traineeId of body.trainee_ids || []) {
        await client.query(
          `INSERT INTO batch_trainees (batch_id, trainee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [batch.id, traineeId]
        );
      }
      await client.query("COMMIT");
      return reply.code(201).send(batch);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; start_date?: string; end_date?: string };
    const result = await pool.query(
      `UPDATE batches SET
         name = COALESCE($2, name),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date)
       WHERE id = $1 RETURNING *`,
      [id, body.name, body.start_date, body.end_date]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "Batch not found" });
    return result.rows[0];
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`DELETE FROM batches WHERE id = $1`, [id]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Batch not found" });
    return reply.code(204).send();
  });

  app.post("/:id/trainees", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { trainee_id } = req.body as { trainee_id: number };
    await pool.query(
      `INSERT INTO batch_trainees (batch_id, trainee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, trainee_id]
    );
    return reply.code(201).send({ batch_id: Number(id), trainee_id });
  });

  app.delete("/:id/trainees/:traineeId", async (req, reply) => {
    const { id, traineeId } = req.params as { id: string; traineeId: string };
    await pool.query(`DELETE FROM batch_trainees WHERE batch_id = $1 AND trainee_id = $2`, [id, traineeId]);
    return reply.code(204).send();
  });
}
