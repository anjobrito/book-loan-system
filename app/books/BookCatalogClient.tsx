"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import {
  cancelMyReservationAction,
  createReservationAction,
  requestLoanAction,
  returnMyLoanAction,
} from "./actions";

export type BookCatalogUser = {
  id: string;
  name: string;
  role: string;
};

export type BookCatalogCopy = {
  id: string;
  bookId: string;
  ownerId: string;
  code: string;
  status: string;
  condition: string | null;
  book: {
    id: string;
    title: string;
    type: string;
    synopsis: string | null;
    edition: string | null;
    publicationYear: number | null;
    publisher: string | null;
    author: string | null;
    genre: string;
    imageUrl: string | null;
  };
  owner: {
    id: string;
    name: string;
  };
  activeLoan: {
    id: string;
    borrowerId: string;
    dueDateFormatted: string;
    borrower: {
      id: string;
      name: string;
    };
  } | null;
  reservations: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
    };
  }>;
};

type BookCatalogClientProps = {
  copies: BookCatalogCopy[];
  currentUser: BookCatalogUser | null;
};

type CategoryGroup = {
  name: string;
  copies: BookCatalogCopy[];
};

function getStatusLabel(status: string) {
  return status === "AVAILABLE" ? "Disponível" : "Emprestado";
}

function getStatusClass(status: string) {
  return status === "AVAILABLE"
    ? "bg-green-500/20 text-green-300"
    : "bg-red-500/20 text-red-300";
}

function getAvailableGenres(copies: BookCatalogCopy[]) {
  return Array.from(new Set(copies.map((copy) => copy.book.genre)))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "pt-BR"));
}

function groupCopiesByCategory(copies: BookCatalogCopy[]): CategoryGroup[] {
  const groups = new Map<string, BookCatalogCopy[]>();

  copies.forEach((copy) => {
    const category = copy.book.genre || "Outros";
    const currentGroup = groups.get(category) ?? [];

    currentGroup.push(copy);
    groups.set(category, currentGroup);
  });

  return Array.from(groups.entries())
    .map(([name, groupCopies]) => ({
      name,
      copies: groupCopies,
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

function BookCover({ copy, size }: { copy: BookCatalogCopy; size: "card" | "modal" }) {
  const coverClass =
    size === "card"
      ? "h-40 w-full rounded-xl border border-slate-700 object-cover shadow"
      : "h-80 w-full rounded-2xl border border-slate-700 object-cover shadow md:h-[28rem]";

  const emptyClass =
    size === "card"
      ? "flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-center text-xs font-semibold text-slate-500"
      : "flex h-80 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-center text-sm font-semibold text-slate-500 md:h-[28rem]";

  if (!copy.book.imageUrl) {
    return <div className={emptyClass}>Sem capa</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={copy.book.imageUrl}
      alt={`Capa do livro ${copy.book.title}`}
      className={coverClass}
    />
  );
}

export default function BookCatalogClient({
  copies,
  currentUser,
}: BookCatalogClientProps) {
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const availableGenres = useMemo(() => getAvailableGenres(copies), [copies]);
  const filteredCopies = useMemo(() => {
    if (selectedGenres.length === 0) {
      return copies;
    }

    return copies.filter((copy) => selectedGenres.includes(copy.book.genre));
  }, [copies, selectedGenres]);
  const categoryGroups = useMemo(
    () => groupCopiesByCategory(filteredCopies),
    [filteredCopies]
  );
  const selectedCopy = useMemo(
    () => copies.find((copy) => copy.id === selectedCopyId) ?? null,
    [copies, selectedCopyId]
  );

  function toggleGenre(genre: string) {
    setSelectedGenres((currentGenres) =>
      currentGenres.includes(genre)
        ? currentGenres.filter((currentGenre) => currentGenre !== genre)
        : [...currentGenres, genre]
    );
  }

  function clearFilters() {
    setSelectedGenres([]);
  }

  function scrollCategory(category: string, direction: "left" | "right") {
    const list = categoryRefs.current[category];

    if (!list) {
      return;
    }

    const firstCard = list.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.offsetWidth ?? 160;
    const gap = 16;
    const fiveCards = (cardWidth + gap) * 5;

    list.scrollBy({
      left: direction === "left" ? -fiveCards : fiveCards,
      behavior: "smooth",
    });
  }

  function closeLightbox() {
    setSelectedCopyId(null);
  }

  return (
    <>
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-300">Filtros por gênero</p>
            <p className="text-xs text-slate-400">
              Sem filtro, todos aparecem. Selecione um ou mais gêneros.
            </p>
          </div>

          {selectedGenres.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-fit rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {availableGenres.map((genre) => {
            const isSelected = selectedGenres.includes(genre);

            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 shadow-lg"
                    : "border border-slate-700 bg-slate-950 text-white hover:border-amber-400/50 hover:bg-slate-800"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      {categoryGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-slate-300">Nenhum exemplar encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryGroups.map((group) => (
            <section key={group.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold leading-6 text-amber-300">
                    {group.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {group.copies.length} exemplar{group.copies.length === 1 ? "" : "es"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scrollCategory(group.name, "left")}
                    className="rounded-full border border-slate-700 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
                    aria-label={`Voltar categoria ${group.name}`}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategory(group.name, "right")}
                    className="rounded-full border border-slate-700 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
                    aria-label={`Avançar categoria ${group.name}`}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div
                ref={(element) => {
                  categoryRefs.current[group.name] = element;
                }}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
              >
                {group.copies.map((copy) => (
                  <button
                    key={copy.id}
                    type="button"
                    onClick={() => setSelectedCopyId(copy.id)}
                    className="group w-36 shrink-0 text-left outline-none md:w-40"
                  >
                    <div className="flex h-full min-h-[18.75rem] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-2 shadow transition group-hover:-translate-y-1 group-hover:border-amber-400/40 group-hover:shadow-xl">
                      <div className="relative">
                        <BookCover copy={copy} size="card" />
                        <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[0.62rem] font-semibold ${getStatusClass(copy.status)}`}>
                          {getStatusLabel(copy.status)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-1 flex-col">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-amber-300">
                          {copy.book.type}
                        </p>
                        <p className="mt-1 line-clamp-2 min-h-9 text-[0.84rem] font-medium leading-[1.15rem] text-white">
                          {copy.book.title}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[0.72rem] text-slate-400">
                          {copy.book.author ?? "Autor não informado"}
                        </p>

                        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                          <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[0.6rem] font-semibold text-amber-300">
                            {copy.book.genre}
                          </span>
                          <span className="rounded-full bg-slate-950 px-2 py-1 text-[0.6rem] font-semibold text-slate-300">
                            {copy.code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedCopy && (
        <BookLightbox
          copy={selectedCopy}
          currentUser={currentUser}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

function BookLightbox({
  copy,
  currentUser,
  onClose,
}: {
  copy: BookCatalogCopy;
  currentUser: BookCatalogUser | null;
  onClose: () => void;
}) {
  const activeLoan = copy.activeLoan;
  const isAvailable = copy.status === "AVAILABLE";
  const isAdmin = currentUser?.role === "ADMIN";
  const isOwner = currentUser?.id === copy.ownerId;
  const canEdit = Boolean(isAdmin || isOwner);
  const isBorrower = activeLoan?.borrower.id === currentUser?.id;
  const hasActiveReservations = copy.reservations.length > 0;
  const currentUserReservation = currentUser
    ? copy.reservations.find((reservation) => reservation.user.id === currentUser.id)
    : null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-semibold text-amber-300">Detalhes do exemplar</p>
            <h2 className="truncate text-lg font-bold text-white md:text-xl">{copy.book.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            aria-label="Fechar detalhes do exemplar"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[16rem_1fr] md:p-5">
          <div>
            <BookCover copy={copy} size="modal" />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-300">{copy.book.type}</p>
                <h3 className="mt-1 text-2xl font-semibold leading-tight text-white md:text-3xl">{copy.book.title}</h3>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(copy.status)}`}>
                {getStatusLabel(copy.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 md:grid-cols-3">
              <p><span className="font-semibold text-slate-500">Dono:</span> {copy.owner.name}</p>
              <p><span className="font-semibold text-slate-500">Código:</span> {copy.code}</p>
              {activeLoan ? (
                <>
                  <p><span className="font-semibold text-slate-500">Com:</span> {activeLoan.borrower.name}</p>
                  <p className="md:col-span-3"><span className="font-semibold text-slate-500">Devolver até:</span> <span className="text-amber-300">{activeLoan.dueDateFormatted}</span></p>
                </>
              ) : (
                <p><span className="font-semibold text-slate-500">Situação:</span> Pronto para empréstimo</p>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {copy.book.synopsis ?? "Sem sinopse cadastrada."}
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950">
              <div className="px-4 py-2 text-sm font-semibold text-amber-300">
                Informações completas
              </div>
              <div className="grid gap-2 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-2">
                <p>Autor: {copy.book.author ?? "Não informado"}</p>
                <p>Gênero: {copy.book.genre}</p>
                <p>Editora: {copy.book.publisher ?? "Não informada"}</p>
                <p>Ano: {copy.book.publicationYear ?? "Não informado"}</p>
                <p>Edição: {copy.book.edition ?? "Não informada"}</p>
                <p>Estado: {copy.condition ?? "Não informado"}</p>
                {activeLoan && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 md:col-span-2">
                    <p>Com: {activeLoan.borrower.name}</p>
                    <p>Devolver até: {activeLoan.dueDateFormatted}</p>
                  </div>
                )}
                {hasActiveReservations && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 md:col-span-2">
                    <p>Reservas ativas: {copy.reservations.length}</p>
                    <p>Primeiro da fila: {copy.reservations[0].user.name}</p>
                  </div>
                )}
                {isOwner && <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-300 md:col-span-2">Este exemplar pertence a você.</div>}
                {isBorrower && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 md:col-span-2">Este exemplar está emprestado para você.</div>}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
      </div>
    </div>
  );
}
