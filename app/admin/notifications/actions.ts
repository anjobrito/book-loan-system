"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { processPendingReturnNotifications } from "@/lib/notifications";

export async function processNotificationsNowAction(): Promise<void> {
  await requireAdmin();

  const result = await processPendingReturnNotifications();

  console.info("Admin processed pending notifications:", result);

  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/loans");
  revalidatePath("/books");
}
