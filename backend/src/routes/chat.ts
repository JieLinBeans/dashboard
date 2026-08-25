import { FastifyInstance } from "fastify";
import { pool } from "../db";

async function buildContextSummary(): Promise<string> {
  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM trainees) AS trainees,
      (SELECT COUNT(*) FROM courses) AS courses,
      (SELECT COUNT(*) FROM batches WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) AS active_batches,
      (SELECT ROUND(AVG(score)) FROM module_attempts WHERE score IS NOT NULL) AS avg_score
  `);
  const row = totals.rows[0];
  return `There are currently ${row.trainees} trainees across ${row.courses} courses, with ${row.active_batches} active batches. The average module score is ${row.avg_score ?? "N/A"}.`;
}

// Very small rule-based responder used when no ANTHROPIC_API_KEY is configured.
async function ruleBasedReply(message: string): Promise<string> {
  const lower = message.toLowerCase();

  if (lower.includes("how many trainee")) {
    const r = await pool.query(`SELECT COUNT(*) FROM trainees`);
    return `There are currently ${r.rows[0].count} trainees in the system.`;
  }
  if (lower.includes("active course") || lower.includes("active batch")) {
    const r = await pool.query(
      `SELECT b.name, c.name AS course_name FROM batches b JOIN courses c ON c.id = b.course_id
       WHERE b.start_date <= CURRENT_DATE AND b.end_date >= CURRENT_DATE`
    );
    if (r.rowCount === 0) return "There are no active batches right now.";
    return `Active batches: ${r.rows.map((b) => `${b.course_name}/${b.name}`).join(", ")}.`;
  }
  if (lower.includes("average score") || lower.includes("avg score")) {
    const r = await pool.query(`SELECT ROUND(AVG(score)) AS avg_score FROM module_attempts WHERE score IS NOT NULL`);
    return `The average score across all module attempts is ${r.rows[0].avg_score ?? "not available yet"}.`;
  }
  if (lower.includes("need") && (lower.includes("attention") || lower.includes("help"))) {
    const r = await pool.query(
      `SELECT DISTINCT t.name FROM trainees t
       JOIN module_attempts a ON a.trainee_id = t.id
       JOIN event_logs el ON el.attempt_id = a.id AND el.is_error
       LIMIT 10`
    );
    if (r.rowCount === 0) return "No trainees currently have flagged errors.";
    return `Trainees who may need attention: ${r.rows.map((t) => t.name).join(", ")}.`;
  }

  const context = await buildContextSummary();
  return `${context} You can ask me things like "how many trainees are there", "which batches are active", "what's the average score", or "who needs attention".`;
}

async function anthropicReply(message: string, apiKey: string): Promise<string> {
  const context = await buildContextSummary();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: `You are the assistant embedded in a driving-instructor LMS trainer portal. Answer briefly and helpfully. Current context: ${context}`,
      messages: [{ role: "user", content: message }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${text}`);
  }
  const data = (await response.json()) as { content: { type: string; text?: string }[] };
  const textBlock = data.content.find((c) => c.type === "text");
  return textBlock?.text || "Sorry, I couldn't generate a response.";
}

export default async function chatRoutes(app: FastifyInstance) {
  app.get("/history", async () => {
    const result = await pool.query(`SELECT * FROM chat_messages ORDER BY created_at`);
    return result.rows;
  });

  app.post("/", async (req, reply) => {
    const { message, trainer_id } = req.body as { message: string; trainer_id?: number };
    if (!message || !message.trim()) {
      return reply.code(400).send({ error: "message is required" });
    }

    await pool.query(`INSERT INTO chat_messages (trainer_id, role, content) VALUES ($1, 'user', $2)`, [
      trainer_id || null,
      message,
    ]);

    let reply_text: string;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    try {
      reply_text = apiKey ? await anthropicReply(message, apiKey) : await ruleBasedReply(message);
    } catch (err) {
      app.log.error(err);
      reply_text = await ruleBasedReply(message);
    } 

    const saved = await pool.query(
      `INSERT INTO chat_messages (trainer_id, role, content) VALUES ($1, 'assistant', $2) RETURNING *`,
      [trainer_id || null, reply_text]
    );

    return saved.rows[0];
  });
}
