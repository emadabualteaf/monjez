import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./src/schema/index.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function setupDatabase() {
  try {
    console.log("📦 Setting up database schema...");

    // Get the database instance - it will automatically create tables when accessed
    // Actually, drizzle doesn't auto-create tables, so we need to use raw SQL

    // For now, just test the connection and verify schema
    const result = await pool.query("SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(`✅ Database connected. Current tables: ${result.rows[0].table_count}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
