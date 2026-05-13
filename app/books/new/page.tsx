import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NewBookForm from "./NewBookForm";

export default async function NewBookPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl sm:p-8">
          <div className="mb-8 text-center">
            <p className="mx-auto mb-4 w-fit rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-300">
              Novo cadastro
            </p>

            <h1 className="text-3xl font-bold md:text-4xl">
              Cadastrar livro, comic ou mangá
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              Preencha as informações da obra e do exemplar físico que será
              disponibilizado para empréstimo.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Este cadastro será vinculado ao usuário logado: {currentUser.name}.
            </p>
          </div>

          <NewBookForm />
        </div>
      </section>
    </main>
  );
}