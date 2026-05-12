import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createReservationAction, requestLoanAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function BooksPage() {
  const copies = await prisma.bookCopy.findMany({
    include: {
      book: true,
      owner: true,
      loans: {
        where: {
          status: "ACTIVE",
        },
        include: {
          borrower: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      reservations: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Catálogo</h1>

            <p className="mt-2 text-slate-300">
              Livros, comics e mangás cadastrados pelos donos.
            </p>
          </div>

          <Link
            href="/books/new"
            className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
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
            {copies.map((copy) => {
              const activeLoan = copy.loans[0];
              const isAvailable = copy.status === "AVAILABLE";
              const hasActiveReservations = copy.reservations.length > 0;
              const marinaReservation = copy.reservations.find(
                (reservation) => reservation.user.email === "marina@email.com"
              );

              return (
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
                        isAvailable
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {isAvailable ? "Disponível" : "Emprestado"}
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

                    {activeLoan && (
                      <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                        <p>Com: {activeLoan.borrower.name}</p>
                        <p>Devolver até: {formatDate(activeLoan.dueDate)}</p>
                      </div>
                    )}

                    {hasActiveReservations && (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                        <p>Reservas ativas: {copy.reservations.length}</p>
                        <p>Primeiro da fila: {copy.reservations[0].user.name}</p>
                      </div>
                    )}
                  </div>

                  {isAvailable ? (
                    <form action={requestLoanAction}>
                      <input type="hidden" name="bookCopyId" value={copy.id} />

                      <button
                        type="submit"
                        className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
                      >
                        Solicitar empréstimo
                      </button>
                    </form>
                  ) : marinaReservation ? (
                    <button
                      disabled
                      className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                    >
                      Reserva registrada
                    </button>
                  ) : (
                    <form action={createReservationAction}>
                      <input type="hidden" name="bookCopyId" value={copy.id} />

                      <button
                        type="submit"
                        className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
                      >
                        Reservar exemplar
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}