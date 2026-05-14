import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; checkEmail?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/books");
  }

  const params = await searchParams;
  const showRegistrationMessage = params.registered === "1";
  const showEmailGuidance = params.checkEmail === "1";

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto" style={{ maxWidth: "520px" }}>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="mx-auto mb-4 w-fit rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300">
              Acesso ao sistema
            </p>

            <h1 className="text-3xl font-bold">Entrar</h1>

            <p className="mt-3 text-sm text-slate-300">
              Informe suas credenciais cadastradas para acessar a Biblioteca
              Comunitária.
            </p>
          </div>

          {showRegistrationMessage && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              <p className="font-semibold text-red-200">
                Cadastro recebido com sucesso.
              </p>

              {showEmailGuidance ? (
                <p className="mt-2">
                  Verifique sua caixa de entrada e também o spam/lixo eletrônico.
                  Seu acesso ficará pendente até você confirmar o e-mail ou até
                  um administrador aprovar seu cadastro em Usuários.
                </p>
              ) : (
                <p className="mt-2">
                  Seu acesso poderá ficar pendente até a confirmação do e-mail
                  ou aprovação por um administrador.
                </p>
              )}
            </div>
          )}

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
