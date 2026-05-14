"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  hashPassword,
  isPasswordHash,
  verifyPassword,
} from "@/lib/password-utils";

export type LoginState = {
  success: boolean;
  message: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
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

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || !verifyPassword(trimmedPassword, user.password)) {
      return {
        success: false,
        message: "E-mail ou senha inválidos.",
      };
    }

    if (!isPasswordHash(user.password)) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashPassword(trimmedPassword),
        },
      });
    }

    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/books");
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return {
      success: false,
      message: "Erro ao realizar login. Tente novamente em instantes.",
    };
  }
}