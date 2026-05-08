export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-300">
          Sistema de Empréstimos
        </p>

        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Biblioteca de Livros, Comics e Mangás
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Cadastre obras, controle donos, acompanhe empréstimos e mantenha o
          histórico completo de quem está com cada exemplar.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/books"
            className="rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-300"
          >
            Ver catálogo
          </a>

          <a
            href="/admin"
            className="rounded-xl border border-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Painel administrativo
          </a>
        </div>
      </section>
    </main>
  );
}