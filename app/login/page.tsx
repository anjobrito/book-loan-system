import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/books");
  }

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow">
          <div className="mb-8 text-center">
            <p className="mx-auto mb-4 w-fit rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-300">
              Acesso ao sistema
            </p>

            <h1 className="text-3xl font-bold">Entrar</h1>

            <p className="mt-3 text-slate-300">
              Use um dos usuários criados pelo seed para acessar o sistema.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            <p className="font-semibold text-amber-300">Usuários de teste</p>

            <div className="mt-3 space-y-2">
              <p>
                <span className="text-slate-500">Admin:</span>{" "}
                anjobrito@gmail.com / 123456
              </p>

              <p>
                <span className="text-slate-500">Usuário:</span>{" "}
                carlos@email.com / 123456
              </p>

              <p>
                <span className="text-slate-500">Usuário:</span>{" "}
                marina@email.com / 123456
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}