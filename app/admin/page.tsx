/* eslint-disable @next/next/no-html-link-for-pages */
export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-amber-300 hover:underline">
          Voltar para início
        </a>

        <h1 className="mt-4 text-3xl font-bold">Painel Administrativo</h1>

        <p className="mt-2 text-slate-300">
          Aqui o administrador poderá controlar empréstimos, devoluções e
          notificações por e-mail.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Empréstimos ativos</p>
            <strong className="mt-2 block text-4xl text-amber-300">0</strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Livros cadastrados</p>
            <strong className="mt-2 block text-4xl text-amber-300">3</strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Atrasados</p>
            <strong className="mt-2 block text-4xl text-red-400">0</strong>
          </div>
        </div>
      </section>
    </main>
  );
}