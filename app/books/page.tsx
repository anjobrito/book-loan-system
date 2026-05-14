import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
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
          <div className="grid gap-4">
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
                  <div className="flex flex-col md:flex-row">
                    <div className="flex shrink-0 justify-center bg-slate-950 p-4 md:w-44">
                      {copy.book.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={copy.book.imageUrl}
                          alt={`Capa do livro ${copy.book.title}`}
                          className="h-60 w-40 rounded-xl border border-slate-700 object-cover shadow md:h-52 md:w-36"
                        />
                      ) : (
                        <div className="flex h-60 w-40 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-center text-sm font-semibold text-slate-500 md:h-52 md:w-36">
                          Sem capa
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-amber-300">
                            {copy.book.type}
                          </p>

                          <h2 className="mt-2 text-2xl font-semibold">
                            {copy.book.title}
                          </h2>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                            isAvailable
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {isAvailable ? "Disponível" : "Emprestado"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 md:grid-cols-3">
                        <p>
                          <span className="font-semibold text-slate-500">
                            Dono:
                          </span>{" "}
                          {copy.owner.name}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-500">
                            Código:
                          </span>{" "}
                          {copy.code}
                        </p>

                        {activeLoan ? (
                          <>
                            <p>
                              <span className="font-semibold text-slate-500">
                                Com:
                              </span>{" "}
                              {activeLoan.borrower.name}
                            </p>

                            <p className="md:col-span-3">
                              <span className="font-semibold text-slate-500">
                                Devolver até:
                              </span>{" "}
                              <span className="text-amber-300">
                                {formatDate(activeLoan.dueDate)}
                              </span>
                            </p>
                          </>
                        ) : (
                          <p>
                            <span className="font-semibold text-slate-500">
                              Situação:
                            </span>{" "}
                            Pronto para empréstimo
                          </p>
                        )}
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {copy.book.synopsis ?? "Sem sinopse cadastrada."}
                      </p>

                      <details className="mt-5 rounded-xl border border-slate-700 bg-slate-950">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-300 marker:text-amber-300">
                          Ver detalhes do exemplar
                        </summary>

                        <div className="space-y-2 border-t border-slate-800 px-4 py-4 text-sm text-slate-300">
                          <p>Dono: {copy.owner.name}</p>
                          <p>Autor: {copy.book.author ?? "Não informado"}</p>
                          <p>Gênero: {copy.book.genre}</p>
                          <p>
                            Edição: {copy.book.edition ?? "Não informada"}
                          </p>
                          <p>Código do exemplar: {copy.code}</p>
                          <p>Estado: {copy.condition ?? "Não informado"}</p>

                          {activeLoan && (
                            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                              <p>Com: {activeLoan.borrower.name}</p>
                              <p>
                                Devolver até: {formatDate(activeLoan.dueDate)}
                              </p>
                            </div>
                          )}

                          {hasActiveReservations && (
                            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                              <p>Reservas ativas: {copy.reservations.length}</p>
                              <p>
                                Primeiro da fila: {" "}
                                {copy.reservations[0].user.name}
                              </p>
                            </div>
                          )}

                          {isOwner && (
                            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-300">
                              Este exemplar pertence a você.
                            </div>
                          )}

                          {isBorrower && (
                            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                              Este exemplar está emprestado para você.
                            </div>
                          )}
                        </div>
                      </details>

                      <div className="mt-5">
                        {!currentUser ? (
                          <Link
                            href="/login"
                            className="block w-full rounded-xl bg-amber-400 px-4 py-2 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300 sm:w-fit"
                          >
                            Entrar para solicitar
                          </Link>
                        ) : isOwner ? (
                          <button
                            disabled
                            className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400 sm:w-fit"
                          >
                            Seu exemplar
                          </button>
                        ) : isAvailable ? (
                          <form action={requestLoanAction}>
                            <input
                              type="hidden"
                              name="bookCopyId"
                              value={copy.id}
                            />

                            <ConfirmSubmitButton
                              confirmMessage={`Confirma solicitar empréstimo de "${copy.book.title}"?`}
                              pendingLabel="Solicitando..."
                              className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-fit"
                            >
                              Solicitar empréstimo
                            </ConfirmSubmitButton>
                          </form>
                        ) : isBorrower ? (
                          <button
                            disabled
                            className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400 sm:w-fit"
                          >
                            Está com você
                          </button>
                        ) : currentUserReservation ? (
                          <button
                            disabled
                            className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400 sm:w-fit"
                          >
                            Reserva registrada
                          </button>
                        ) : (
                          <form action={createReservationAction}>
                            <input
                              type="hidden"
                              name="bookCopyId"
                              value={copy.id}
                            />

                            <ConfirmSubmitButton
                              confirmMessage={`Confirma reservar "${copy.book.title}"?`}
                              pendingLabel="Reservando..."
                              className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-fit"
                            >
                              Reservar exemplar
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </div>
                    </div>
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
