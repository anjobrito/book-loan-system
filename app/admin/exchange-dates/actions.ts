"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ensureExchangeDateTable } from "@/lib/exchange-dates";

export async function createExchangeDateAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await ensureExchangeDateTable();

  const dateValue = formData.get("date");
  const descriptionValue = formData.get("description");

  if (typeof dateValue !== "string" || dateValue.trim().length === 0) {
    return;
  }

  const exchangeDate = new Date(`${dateValue}T12:00:00`);

  if (Number.isNaN(exchangeDate.getTime())) {
    return;
  }

  const description =
    typeof descriptionValue === "string" && descriptionValue.trim().length > 0
      ? descriptionValue.trim()
      : null;

  await prisma.$executeRaw`
    INSERT INTO "ExchangeDate" ("id", "date", "description", "status", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${exchangeDate}, ${description}, 'ACTIVE', NOW(), NOW())
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/exchange-dates");
}

export async function cancelExchangeDateAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await ensureExchangeDateTable();

  const exchangeDateId = formData.get("exchangeDateId");

  if (typeof exchangeDateId !== "string" || exchangeDateId.trim().length === 0) {
    return;
  }

  await prisma.$executeRaw`
    UPDATE "ExchangeDate"
    SET "status" = 'CANCELED', "updatedAt" = NOW()
    WHERE "id" = ${exchangeDateId}
  `;

  revalidatePath("/admin");
  revalidatePath("/admin/exchange-dates");
}
