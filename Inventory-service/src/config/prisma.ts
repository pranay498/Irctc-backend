import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

declare global {
    var prisma: PrismaClient | undefined;
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma =
    global.prisma ??
    new PrismaClient({
        adapter,
        log: ["query", "info", "warn", "error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export { prisma };