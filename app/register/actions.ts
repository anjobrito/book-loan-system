"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendRegistrationConfirmationEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password-utils";

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

  const trimmedName = name.trim();
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

  const verificationCode = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: normalizedEmail,
      password: hashPassword(trimmedPassword),
      role: "USER",
      accessStatus: "PENDING",
      emailVerifications: {
        create: {
          code: verificationCode,
          expiresAt,
        },
      },
    },
  });

  try {
    await sendRegistrationConfirmationEmail({
      to: user.email,
      userName: user.name,
      code: verificationCode,
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail de confirmação de cadastro:", error);
  }

  redirect("/login?registered=1");
}
