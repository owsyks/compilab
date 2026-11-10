import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { hash, compare } from "bcryptjs";
import { APIError } from "better-auth/api";
import { db } from "./db";
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  secret:
    process.env.AUTH_SECRET ||
    "compilab-auth-secret-for-build-minimum-32-chars-ok",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 72,
    password: {
      hash: async (password) => {
        if (Buffer.byteLength(password, "utf8") > 72)
          throw new APIError("BAD_REQUEST", {
            message: "Use at most 72 UTF-8 bytes for a password.",
          });
        return hash(password, 12);
      },
      verify: async ({ password, hash }) =>
        Buffer.byteLength(password, "utf8") <= 72 && compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "STUDENT", input: false },
      preferences: { type: "json", defaultValue: {}, input: false },
    },
    deleteUser: { enabled: true },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 60,
    max: 60,
    customRules: { "/sign-up/email": { window: 60, max: 12 } },
  },
});
