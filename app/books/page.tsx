import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createReservationAction, requestLoanAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function BooksPage() {
  const currentUser = await getCurrentUser();

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
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Catálogo</h1>

            <p className="mt-2 text-slate-300">
              Livros, comics e mangás cadastrados pelos donos.
            </p>

            {!currentUser && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Entre ou crie uma conta para solicitar empréstimos, reservar
                exemplares e cadastrar livros.
              </p>
            )}
          </div>

          {currentUser ? (
            <Link
              href="/books/new"
              className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
            >
              Cadastrar livro
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
            >
              Entrar para cadastrar
            </Link>
          )}
        </div>

        {copies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">Nenhum livro cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copies.map((copy) => {
              const activeLoan = copy.loans[0];
              const isAvailable = copy.status === "AVAILABLE";
              const isOwner = currentUser?.id === copy.ownerId;
              const isBorrower = activeLoan?.borrower.id === currentUser?.id;
              const hasActiveReservations = copy.reservations.length > 0;
              const currentUserReservation = currentUser
                ? copy.reservations.find(
                    (reservation) => reservation.user.id === currentUser.id
                  )
                : null;

              return (
                <article
                  key={copy.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow"
                >
                  {copy.book.imageUrl ? (
                    <div className="h-64 w-full overflow-hidden bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={copy.book.imageUrl}
                        alt={`Capa de ${copy.book.title}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center bg-slate-950">
                      <div className="rounded-2xl border border-slate-800 px-6 py-4 text-center">
                        <p className="text-sm font-semibold text-slate-400">
                          Sem capa
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          Imagem não cadastrada
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
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
                          <p>
                            Primeiro da fila: {copy.reservations[0].user.name}
                          </p>
                        </div>
                      )}

                      {isOwner && (
                        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300">
                          Este exemplar pertence a você.
                        </div>
                      )}

                      {isBorrower && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                          Este exemplar está emprestado para você.
                        </div>
                      )}
                    </div>

                    {!currentUser ? (
                      <Link
                        href="/login"
                        className="mt-5 block w-full rounded-xl bg-amber-400 px-4 py-2 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
                      >
                        Entrar para solicitar
                      </Link>
                    ) : isOwner ? (
                      <button
                        disabled
                        className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                      >
                        Seu exemplar
                      </button>
                    ) : isAvailable ? (
                      <form action={requestLoanAction}>
                        <input type="hidden" name="bookCopyId" value={copy.id} />

                        <button
                          type="submit"
                          className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
                        >
                          Solicitar empréstimo
                        </button>
                      </form>
                    ) : isBorrower ? (
                      <button
                        disabled
                        className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                      >
                        Está com você
                      </button>
                    ) : currentUserReservation ? (
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
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}