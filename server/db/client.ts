import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.VERCEL
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(process.env.VERCEL ? 'SUPABASE_DATABASE_URL is not set' : 'DATABASE_URL is not set');
}

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
export { client };
export default db;
