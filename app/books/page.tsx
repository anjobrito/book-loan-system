/* eslint-disable @next/next/no-html-link-for-pages */
const books = [
  {
    id: 1,
    title: "Batman: Ano Um",
    type: "Comic",
    owner: "André",
    genre: "Aventura",
    status: "Disponível",
  },
  {
    id: 2,
    title: "O Iluminado",
    type: "Livro",
    owner: "Carlos",
    genre: "Terror",
    status: "Emprestado",
  },
  {
    id: 3,
    title: "Naruto Vol. 1",
    type: "Mangá",
    owner: "Mariana",
    genre: "Aventura",
    status: "Disponível",
  },
];

export default function BooksPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <a href="/" className="text-sm text-amber-300 hover:underline">
            Voltar para início
          </a>

          <h1 className="mt-4 text-3xl font-bold">Catálogo</h1>

          <p className="mt-2 text-slate-300">
            Lista inicial de livros, comics e mangás cadastrados no sistema.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {books.map((book) => (
            <article
              key={book.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow"
            >
              <p className="text-sm text-amber-300">{book.type}</p>

              <h2 className="mt-2 text-xl font-semibold">{book.title}</h2>

              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Dono: {book.owner}</p>
                <p>Gênero: {book.genre}</p>
                <p>Status: {book.status}</p>
              </div>

              <button className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300">
                Solicitar empréstimo
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}