import { drizzle } from "drizzle-orm/node-postgres";
import * as pg from "pg"; // ✅ التعديل هنا: استخدام * as pg لحل مشكلة Default Export

import * as schema from "./schema";

// استخراج Pool من مكتبة pg بشكل متوافق مع TS
const Pool = pg.Pool; 

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// إنشاء الاتصال باستخدام الـ Pool المصحح
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const db = drizzle(pool, { schema });

export * from "./schema";