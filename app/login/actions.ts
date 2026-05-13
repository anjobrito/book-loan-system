"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export type LoginState = {
  success: boolean;
  message: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || email.trim().length === 0) {
    return {
      success: false,
      message: "Informe o e-mail.",
    };
  }

  if (typeof password !== "string" || password.trim().length === 0) {
    return {
      success: false,
      message: "Informe a senha.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim(),
    },
  });

  if (!user || user.password !== password.trim()) {
    return {
      success: false,
      message: "E-mail ou senha inválidos.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/books");
}