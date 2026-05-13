import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export async function requireAdmin(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/books");
  }

  return currentUser;
}