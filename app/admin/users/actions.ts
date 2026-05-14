"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

async function updateUserAccessStatus(
  userId: FormDataEntryValue | null,
  accessStatus: string
) {
  const currentUser = await requireAdmin();

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return;
  }

  if (currentUser.id === userId) {
    return;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      accessStatus,
      approvedAt: accessStatus === "APPROVED" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function approveUserAction(formData: FormData): Promise<void> {
  await updateUserAccessStatus(formData.get("userId"), "APPROVED");
}

export async function blockUserAction(formData: FormData): Promise<void> {
  await updateUserAccessStatus(formData.get("userId"), "BLOCKED");
}
