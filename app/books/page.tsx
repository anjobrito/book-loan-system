import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import {
  cancelMyReservationAction,
  createReservationAction,
  requestLoanAction,
  returnMyLoanAction,
} from "./actions";

const PAGE_SIZE = 6;

type BooksPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getValidPage(page?: string) {
  const parsedPage = Number(page);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return Math.floor(parsedPage);
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  const half = Math.floor(maxVisiblePages / 2);

  let startPage = Math.max(1, currentPage - half);
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );
}

function PaginationControls({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-300">
        Página <span className="font-semibold text-amber-300">{currentPage}</span>{" "}
        de <span className="font-semibold text-amber-300">{totalPages}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        {currentPage > 1 ? (
          <Link
            href={`/books?page=${currentPage - 1}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-slate-800"
          >
            Anterior
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-600">
            Anterior
          </span>
        )}

        {pageNumbers.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={`/books?page=${pageNumber}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold no-underline ${
              pageNumber === currentPage
                ? "bg-amber-400 text-slate-950"
                : "border border-slate-700 text-white hover:bg-slate-800"
            }`}
          >
            {pageNumber}
          </Link>
        ))}

        {currentPage < totalPages ? (
          <Link
            href={`/books?page=${currentPage + 1}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-slate-800"
          >
            Próxima
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-600">
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await searchParams;
  const requestedPage = getValidPage(params?.page);

  const [currentUser, totalCopies] = await Promise.all([
    getCurrentUser(),
    prisma.bookCopy.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCopies / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const isAdmin = currentUser?.role === "ADMIN";

  const copies = await prisma.bookCopy.findMany({
    skip,
    take: PAGE_SIZE,
    include: {
      book: true,
      owner: true,
      loans: {
        where: { status: "ACTIVE" },
        include: { borrower: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      reservations: {
        where: { status: "ACTIVE" },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const firstVisibleItem =
    totalCopies === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisibleItem = Math.min(currentPage * PAGE_SIZE, totalCopies);

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
                Entre ou crie uma conta para solicitar empréstimos, reservar exemplares e cadastrar livros.
              </p>
            )}
          </div>

          {currentUser ? (
            <Link href="/books/new" className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300">
              Cadastrar livro
            </Link>
          ) : (
            <Link href="/login" className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300">
              Entrar para cadastrar
            </Link>
          )}
        </div>

        {copies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">Nenhum livro cadastrado ainda.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
              Exibindo{" "}
              <span className="font-semibold text-amber-300">
                {firstVisibleItem}
              </span>{" "}
              até{" "}
              <span className="font-semibold text-amber-300">
                {lastVisibleItem}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-amber-300">
                {totalCopies}
              </span>{" "}
              exemplares cadastrados.
            </div>

            <div className="grid gap-4">
              {copies.map((copy) => {
                const activeLoan = copy.loans[0];
                const isAvailable = copy.status === "AVAILABLE";
                const isOwner = currentUser?.id === copy.ownerId;
                const canEdit = isAdmin || isOwner;
                const isBorrower = activeLoan?.borrower.id === currentUser?.id;
                const hasActiveReservations = copy.reservations.length > 0;
                const currentUserReservation = currentUser
                  ? copy.reservations.find((reservation) => reservation.user.id === currentUser.id)
                  : null;

                return (
                  <article key={copy.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow">
                    <div className="flex flex-col md:flex-row">
                      <div className="flex shrink-0 justify-center bg-slate-950 p-4 md:w-44">
                        {copy.book.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={copy.book.imageUrl} alt={`Capa do livro ${copy.book.title}`} className="h-60 w-40 rounded-xl border border-slate-700 object-cover shadow md:h-52 md:w-36" />
                        ) : (
                          <div className="flex h-60 w-40 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-center text-sm font-semibold text-slate-500 md:h-52 md:w-36">
                            Sem capa
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-amber-300">{copy.book.type}</p>
                            <h2 className="mt-2 text-2xl font-semibold">{copy.book.title}</h2>
                          </div>
                          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${isAvailable ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                            {isAvailable ? "Disponível" : "Emprestado"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 md:grid-cols-3">
                          <p><span className="font-semibold text-slate-500">Dono:</span> {copy.owner.name}</p>
                          <p><span className="font-semibold text-slate-500">Código:</span> {copy.code}</p>
                          {activeLoan ? (
                            <>
                              <p><span className="font-semibold text-slate-500">Com:</span> {activeLoan.borrower.name}</p>
                              <p className="md:col-span-3"><span className="font-semibold text-slate-500">Devolver até:</span> <span className="text-amber-300">{formatDate(activeLoan.dueDate)}</span></p>
                            </>
                          ) : (
                            <p><span className="font-semibold text-slate-500">Situação:</span> Pronto para empréstimo</p>
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
                            {isOwner && <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-300">Este exemplar pertence a você.</div>}
                            {isBorrower && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">Este exemplar está emprestado para você.</div>}
                          </div>
                        </details>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {canEdit && (
                            <Link
                              href={`/books/${copy.id}/edit`}
                              className="block w-full rounded-xl border border-slate-700 px-4 py-2 text-center font-semibold text-white no-underline hover:bg-slate-800 sm:w-fit"
                            >
                              Editar cadastro
                            </Link>
                          )}

                          {!currentUser ? (
                            <Link href="/login" className="block w-full rounded-xl bg-amber-400 px-4 py-2 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300 sm:w-fit">
                              Entrar para solicitar
                            </Link>
                          ) : isOwner ? (
                            <button disabled className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400 sm:w-fit">Seu exemplar</button>
                          ) : isAvailable ? (
                            <form action={requestLoanAction}>
                              <input type="hidden" name="bookCopyId" value={copy.id} />
                              <ConfirmSubmitButton confirmMessage={`Confirma solicitar empréstimo de "${copy.book.title}"?`} pendingLabel="Solicitando..." className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-fit">
                                Solicitar empréstimo
                              </ConfirmSubmitButton>
                            </form>
                          ) : isBorrower && activeLoan ? (
                            <form action={returnMyLoanAction}>
                              <input type="hidden" name="loanId" value={activeLoan.id} />
                              <ConfirmSubmitButton confirmMessage={`Confirma devolver "${copy.book.title}" agora?`} pendingLabel="Devolvendo..." className="w-full rounded-xl bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-fit">
                                Devolver agora
                              </ConfirmSubmitButton>
                            </form>
                          ) : currentUserReservation ? (
                            <form action={cancelMyReservationAction}>
                              <input type="hidden" name="reservationId" value={currentUserReservation.id} />
                              <ConfirmSubmitButton confirmMessage={`Confirma cancelar sua reserva de "${copy.book.title}"?`} pendingLabel="Cancelando..." className="w-full rounded-xl border border-red-400/50 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 sm:w-fit">
                                Cancelar reserva
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form action={createReservationAction}>
                              <input type="hidden" name="bookCopyId" value={copy.id} />
                              <ConfirmSubmitButton confirmMessage={`Confirma reservar "${copy.book.title}"?`} pendingLabel="Reservando..." className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-fit">
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

            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          </>
        )}
      </section>
    </main>
  );
}
