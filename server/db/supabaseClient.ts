import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let cachedUrl: string | undefined;
let cachedConnection: ReturnType<typeof createConnection> | undefined;

function createConnection(connectionString: string) {
  const client = postgres(connectionString, { max: 5 });
  return { client, db: drizzle(client, { schema }) };
}

export function isSupabaseDatabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL);
}

export function getSupabaseConnection() {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DATABASE_URL is not configured for cloud backup');
  }

  if (!cachedConnection || cachedUrl !== connectionString) {
    cachedConnection = createConnection(connectionString);
    cachedUrl = connectionString;
  }
  return cachedConnection;
}
