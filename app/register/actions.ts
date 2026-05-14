"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export type RegisterState = {
  success: boolean;
  message: string;
};

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof name !== "string" || name.trim().length === 0) {
    return {
      success: false,
      message: "Informe o nome.",
    };
  }

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

  if (
    typeof confirmPassword !== "string" ||
    confirmPassword.trim().length === 0
  ) {
    return {
      success: false,
      message: "Confirme a senha.",
    };
  }

  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  if (trimmedPassword.length < 6) {
    return {
      success: false,
      message: "A senha precisa ter pelo menos 6 caracteres.",
    };
  }

  if (trimmedPassword !== trimmedConfirmPassword) {
    return {
      success: false,
      message: "As senhas não conferem.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    return {
      success: false,
      message: "Já existe um usuário cadastrado com esse e-mail.",
    };
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashPassword(trimmedPassword),
      role: "USER",
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/books");
}
