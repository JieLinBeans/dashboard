import { FastifyInstance } from "fastify";
import { pool } from "../db";

export default async function coursesRoutes(app: FastifyInstance) {
  // List all courses, with their batches nested (for the Courses management page)
  app.get("/", async () => {
    const courses = await pool.query(`SELECT * FROM courses ORDER BY id`);
    const batches = await pool.query(`
      SELECT b.*, c.name AS course_name
      FROM batches b JOIN courses c ON c.id = b.course_id
      ORDER BY b.start_date NULLS LAST, b.id
    `);
    return {
      courses: courses.rows,
      batches: batches.rows,
    };
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const course = await pool.query(`SELECT * FROM courses WHERE id = $1`, [id]);
    if (course.rowCount === 0) return reply.code(404).send({ error: "Course not found" });

    const modules = await pool.query(
      `SELECT m.* FROM modules m
       JOIN course_modules cm ON cm.module_id = m.id
       WHERE cm.course_id = $1 ORDER BY cm.sort_order, m.id`,
      [id]
    );
    const prerequisites = await pool.query(
      `SELECT c.id, c.name FROM course_prerequisites cp
       JOIN courses c ON c.id = cp.prerequisite_course_id
       WHERE cp.course_id = $1`,
      [id]
    );
    const batches = await pool.query(`SELECT * FROM batches WHERE course_id = $1 ORDER BY id`, [id]);

    return {
      ...course.rows[0],
      modules: modules.rows,
      prerequisites: prerequisites.rows,
      batches: batches.rows,
    };
  });

  app.post("/", async (req, reply) => {
    const body = req.body as {
      name: string;
      description?: string;
      skills_learnt?: string;
      estimated_time?: string;
      prerequisite_course_ids?: number[];
      module_ids?: number[];
      trainee_ids?: number[];
      batch_name?: string;
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const courseResult = await client.query(
        `INSERT INTO courses (name, description, skills_learnt, estimated_time)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [body.name, body.description || null, body.skills_learnt || null, body.estimated_time || null]
      );
      const course = courseResult.rows[0];

      for (const prereqId of body.prerequisite_course_ids || []) {
        await client.query(
          `INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES ($1, $2)`,
          [course.id, prereqId]
        );
      }

      let order = 0;
      for (const moduleId of body.module_ids || []) {
        await client.query(
          `INSERT INTO course_modules (course_id, module_id, sort_order) VALUES ($1, $2, $3)`,
          [course.id, moduleId, order++]
        );
      }

      if (body.trainee_ids && body.trainee_ids.length > 0) {
        const batchResult = await client.query(
          `INSERT INTO batches (course_id, name) VALUES ($1, $2) RETURNING *`,
          [course.id, body.batch_name || "Batch 1"]
        );
        const batch = batchResult.rows[0];
        for (const traineeId of body.trainee_ids) {
          await client.query(
            `INSERT INTO batch_trainees (batch_id, trainee_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [batch.id, traineeId]
          );
        }
      }

      await client.query("COMMIT");
      return reply.code(201).send(course);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.put("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      name?: string;
      description?: string;
      skills_learnt?: string;
      estimated_time?: string;
    };
    const result = await pool.query(
      `UPDATE courses SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         skills_learnt = COALESCE($4, skills_learnt),
         estimated_time = COALESCE($5, estimated_time)
       WHERE id = $1 RETURNING *`,
      [id, body.name, body.description, body.skills_learnt, body.estimated_time]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "Course not found" });
    return result.rows[0];
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`DELETE FROM courses WHERE id = $1`, [id]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Course not found" });
    return reply.code(204).send();
  });
}
