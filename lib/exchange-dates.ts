import { prisma } from "@/lib/prisma";

export const MIN_READING_DAYS = 21;
export const FALLBACK_LOAN_DAYS = 30;

export type ExchangeDateRow = {
  id: string;
  date: Date;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureExchangeDateTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ExchangeDate" (
      "id" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExchangeDate_pkey" PRIMARY KEY ("id")
    )
  `;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function getActiveExchangeDates() {
  await ensureExchangeDateTable();

  return prisma.$queryRaw<ExchangeDateRow[]>`
    SELECT "id", "date", "description", "status", "createdAt", "updatedAt"
    FROM "ExchangeDate"
    WHERE "status" = 'ACTIVE'
    ORDER BY "date" ASC
  `;
}

export async function calculateLoanDueDate(startDate = new Date()) {
  await ensureExchangeDateTable();

  const minimumDueDate = addDays(startDate, MIN_READING_DAYS);
  const exchangeDates = await prisma.$queryRaw<Pick<ExchangeDateRow, "date">[]>`
    SELECT "date"
    FROM "ExchangeDate"
    WHERE "status" = 'ACTIVE'
      AND "date" >= ${minimumDueDate}
    ORDER BY "date" ASC
    LIMIT 1
  `;

  if (exchangeDates.length > 0) {
    return exchangeDates[0].date;
  }

  return addDays(startDate, FALLBACK_LOAN_DAYS);
}
