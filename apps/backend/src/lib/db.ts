import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../db/schema.js';

const client = createClient({
  url: `file:${process.env.DB_FILE_NAME!}`
});

export const db = drizzle(client, { schema });
