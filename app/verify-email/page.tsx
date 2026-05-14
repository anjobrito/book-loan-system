import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code;

  let title = "Link inválido";
  let message =
    "Não foi possível confirmar seu cadastro. O link pode estar incorreto ou expirado.";
  let success = false;

  if (code) {
    const verification = await prisma.emailVerification.findUnique({
      where: {
        code,
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      title = "Código não encontrado";
      message = "Este link de confirmação não foi encontrado.";
    } else if (verification.usedAt) {
      title = "Cadastro já confirmado";
      message = "Este cadastro já foi confirmado anteriormente. Você já pode fazer login.";
      success = true;
    } else if (verification.expiresAt < new Date()) {
      title = "Link expirado";
      message =
        "Este link de confirmação expirou. Peça para um administrador liberar seu cadastro.";
    } else {
      await prisma.$transaction([
        prisma.emailVerification.update({
          where: {
            id: verification.id,
          },
          data: {
            usedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: {
            id: verification.userId,
          },
          data: {
            accessStatus: "APPROVED",
            emailVerifiedAt: new Date(),
            approvedAt: new Date(),
          },
        }),
      ]);

      title = "Cadastro confirmado";
      message =
        "Seu e-mail foi confirmado e seu acesso foi liberado. Agora você já pode entrar no sistema.";
      success = true;
    }
  }

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <p
          className={`mx-auto mb-5 w-fit rounded-full px-4 py-2 text-sm font-semibold ${
            success
              ? "bg-green-500/20 text-green-300"
              : "bg-amber-500/20 text-amber-300"
          }`}
        >
          Biblioteca Comunitária
        </p>

        <h1 className="text-3xl font-bold">{title}</h1>

        <p className="mt-4 leading-7 text-slate-300">{message}</p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 no-underline hover:bg-amber-300"
        >
          Ir para o login
        </Link>
      </section>
    </main>
  );
}
