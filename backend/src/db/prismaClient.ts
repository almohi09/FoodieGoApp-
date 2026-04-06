import { PrismaClient } from "@prisma/client";
import env from "../config/env.js";

declare global {
  // eslint-disable-next-line no-var
  var __foodiegoPrisma__: PrismaClient | undefined;
}

const createClient = () =>
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["query", "warn", "error"] : ["error"],
  });

export const prisma = globalThis.__foodiegoPrisma__ ?? createClient();

if (env.nodeEnv !== "production") {
  globalThis.__foodiegoPrisma__ = prisma;
}

export const usePostgres = env.usePostgres;
