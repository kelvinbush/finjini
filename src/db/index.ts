import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index";
import * as relations from "./relations";
import { config as loadEnv } from "dotenv";
import ws from "ws";
import { neonConfig, Pool } from "@neondatabase/serverless";

loadEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({
  client: pool,
  schema: {
    ...schema,
    ...relations,
  },
});

export type DB = typeof db;
