import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
loadEnv();
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}
export default defineConfig({
    schema: "./src/db/schema/*.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    verbose: true,
    strict: true,
});
//# sourceMappingURL=drizzle.config.js.map