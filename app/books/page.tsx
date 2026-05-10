import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BooksPage() {
  const copies = await prisma.bookCopy.findMany({
    include: {
      book: true,
      owner: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm text-amber-300 hover:underline">
              Voltar para início
            </Link>

            <h1 className="mt-4 text-3xl font-bold">Catálogo</h1>

            <p className="mt-2 text-slate-300">
              Livros, comics e mangás cadastrados pelos donos.
            </p>
          </div>

          <Link
            href="/books/new"
            className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-amber-300"
          >
            Cadastrar livro
          </Link>
        </div>

        {copies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">Nenhum livro cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {copies.map((copy) => (
              <article
                key={copy.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-amber-300">
                    {copy.book.type}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      copy.status === "AVAILABLE"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {copy.status === "AVAILABLE" ? "Disponível" : "Emprestado"}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold">
                  {copy.book.title}
                </h2>

                <p className="mt-3 text-sm text-slate-300">
                  {copy.book.synopsis ?? "Sem sinopse cadastrada."}
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>Dono: {copy.owner.name}</p>
                  <p>Autor: {copy.book.author ?? "Não informado"}</p>
                  <p>Gênero: {copy.book.genre}</p>
                  <p>Edição: {copy.book.edition ?? "Não informada"}</p>
                  <p>Código do exemplar: {copy.code}</p>
                  <p>Estado: {copy.condition ?? "Não informado"}</p>
                </div>

                <button
                  disabled={copy.status !== "AVAILABLE"}
                  className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {copy.status === "AVAILABLE"
                    ? "Solicitar empréstimo"
                    : "Indisponível"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}