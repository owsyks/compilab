import { defineConfig } from "prisma/config";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://compilab:compilab@127.0.0.1:55432/compilab",
  },
});
