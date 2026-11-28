import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  throw new Error('SUPABASE_DATABASE_URL is required for the Supabase migration config.');
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
