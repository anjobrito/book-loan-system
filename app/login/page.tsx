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
      <section className="mx-auto" style={{ maxWidth: "520px" }}>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="mx-auto mb-4 w-fit rounded-full border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-300">
              Acesso ao sistema
            </p>

            <h1 className="text-3xl font-bold">Entrar</h1>

            <p className="mt-3 text-sm text-slate-300">
              Informe suas credenciais cadastradas para acessar o Book Loan
              System.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
