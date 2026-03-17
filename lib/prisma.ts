// Prisma v7 + SQLite adapter
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

function createPrismaClient() {
  const dbPath = path.resolve(process.cwd(), "dev.db").replace(/\\/g, "/");
  const libsql = createClient({ url: `file:///${dbPath}` });
  const adapter = new PrismaLibSql(libsql);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;