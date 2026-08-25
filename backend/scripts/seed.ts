import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/db";

async function main() {
  const file = path.join(__dirname, "..", "seed", "seed.sql");
  const sql = fs.readFileSync(file, "utf-8");
  console.log("Seeding database...");
  await pool.query(sql);
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
