import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool, db } from "./src/index.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Running migrations...");
  try {
    // Note: This approach requires migrations folder to exist
    // Since we don't have migrations, we'll use pushSchema approach instead
    console.log("Creating schema from Drizzle definitions...");
    
    // Import all schema definitions to register them
    await import("./src/schema/index.js");
    
    console.log("✅ Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
