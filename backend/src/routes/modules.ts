import { FastifyInstance } from "fastify";
import { pool } from "../db";

export default async function modulesRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const result = await pool.query(`SELECT * FROM modules ORDER BY id`);
    return result.rows;
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const module = await pool.query(`SELECT * FROM modules WHERE id = $1`, [id]);
    if (module.rowCount === 0) return reply.code(404).send({ error: "Module not found" });

    const prerequisites = await pool.query(
      `SELECT m.id, m.name FROM module_prerequisites mp
       JOIN modules m ON m.id = mp.prerequisite_module_id
       WHERE mp.module_id = $1`,
      [id]
    );
    const indicators = await pool.query(
      `SELECT * FROM performance_indicators WHERE module_id = $1 ORDER BY id`,
      [id]
    );

    return { ...module.rows[0], prerequisites: prerequisites.rows, performance_indicators: indicators.rows };
  });

  app.post("/", async (req, reply) => {
    const body = req.body as {
      name: string;
      description?: string;
      skills_learnt?: string;
      estimated_time?: string;
      prerequisite_module_ids?: number[];
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO modules (name, description, skills_learnt, estimated_time)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [body.name, body.description || null, body.skills_learnt || null, body.estimated_time || null]
      );
      const module = result.rows[0];

      for (const prereqId of body.prerequisite_module_ids || []) {
        await client.query(
          `INSERT INTO module_prerequisites (module_id, prerequisite_module_id) VALUES ($1, $2)`,
          [module.id, prereqId]
        );
      }

      await client.query("COMMIT");
      return reply.code(201).send(module);
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
      `UPDATE modules SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         skills_learnt = COALESCE($4, skills_learnt),
         estimated_time = COALESCE($5, estimated_time)
       WHERE id = $1 RETURNING *`,
      [id, body.name, body.description, body.skills_learnt, body.estimated_time]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "Module not found" });
    return result.rows[0];
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await pool.query(`DELETE FROM modules WHERE id = $1`, [id]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Module not found" });
    return reply.code(204).send();
  });

  app.post("/:id/performance-indicators", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name: string; measurement?: string; weight?: number };
    const result = await pool.query(
      `INSERT INTO performance_indicators (module_id, name, measurement, weight)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, body.name, body.measurement || null, body.weight || null]
    );
    return reply.code(201).send(result.rows[0]);
  });
}
