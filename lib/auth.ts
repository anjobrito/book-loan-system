import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "book-loan-user-id";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();

  return user?.role === "ADMIN";
}