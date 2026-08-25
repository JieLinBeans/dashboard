import { Pool, QueryResultRow } from "pg";

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || "lms_user",
        password: process.env.PGPASSWORD || "lms_password",
        database: process.env.PGDATABASE || "lms_db",
      }
);

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const result = await pool.query<T>(text, params);
  return result;
}
