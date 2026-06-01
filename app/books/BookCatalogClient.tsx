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

function getStatusLabel(status: string) {
  return status === "AVAILABLE" ? "Disponível" : "Emprestado";
}

function getStatusClass(status: string) {
  return status === "AVAILABLE"
    ? "bg-green-500/20 text-green-300"
    : "bg-red-500/20 text-red-300";
}

function BookCover({ copy, size }: { copy: BookCatalogCopy; size: "card" | "modal" }) {
  const coverClass =
    size === "card"
      ? "h-72 w-full rounded-2xl border border-slate-700 object-cover shadow"
      : "h-80 w-full rounded-2xl border border-slate-700 object-cover shadow md:h-[28rem]";

  const emptyClass =
    size === "card"
      ? "flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-center text-sm font-semibold text-slate-500"
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
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCopy = useMemo(
    () => copies.find((copy) => copy.id === selectedCopyId) ?? null,
    [copies, selectedCopyId]
  );

  function scrollCatalog(direction: "left" | "right") {
    listRef.current?.scrollBy({
      left: direction === "left" ? -520 : 520,
      behavior: "smooth",
    });
  }

  function closeLightbox() {
    setSelectedCopyId(null);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-semibold text-amber-300">{copies.length}</span>{" "}
          exemplares cadastrados. Clique em uma capa para ver detalhes, solicitar empréstimo ou reservar.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollCatalog("left")}
            className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            aria-label="Voltar catálogo"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollCatalog("right")}
            className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            aria-label="Avançar catálogo"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-4"
      >
        {copies.map((copy) => (
          <button
            key={copy.id}
            type="button"
            onClick={() => setSelectedCopyId(copy.id)}
            className="group w-56 shrink-0 text-left outline-none md:w-64"
          >
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-3 shadow transition group-hover:-translate-y-1 group-hover:border-amber-400/40 group-hover:shadow-2xl">
              <div className="relative">
                <BookCover copy={copy} size="card" />
                <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(copy.status)}`}>
                  {getStatusLabel(copy.status)}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {copy.book.type}
                </p>
                <h2 className="mt-2 line-clamp-2 min-h-14 text-lg font-semibold text-white">
                  {copy.book.title}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {copy.book.author ?? "Autor não informado"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    {copy.book.genre}
                  </span>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                    {copy.code}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Dono: {copy.owner.name}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-amber-300">Detalhes do exemplar</p>
            <h2 className="text-xl font-bold text-white">{copy.book.title}</h2>
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

        <div className="grid gap-6 p-5 md:grid-cols-[18rem_1fr] md:p-6">
          <div>
            <BookCover copy={copy} size="modal" />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-300">{copy.book.type}</p>
                <h3 className="mt-2 text-3xl font-semibold text-white">{copy.book.title}</h3>
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

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950">
              <div className="px-4 py-3 text-sm font-semibold text-amber-300">
                Informações completas
              </div>
              <div className="space-y-2 border-t border-slate-800 px-4 py-4 text-sm text-slate-300">
                <p>Dono: {copy.owner.name}</p>
                <p>Autor: {copy.book.author ?? "Não informado"}</p>
                <p>Gênero: {copy.book.genre}</p>
                <p>Editora: {copy.book.publisher ?? "Não informada"}</p>
                <p>Ano de publicação: {copy.book.publicationYear ?? "Não informado"}</p>
                <p>Edição: {copy.book.edition ?? "Não informada"}</p>
                <p>Código do exemplar: {copy.code}</p>
                <p>Estado: {copy.condition ?? "Não informado"}</p>
                {activeLoan && (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    <p>Com: {activeLoan.borrower.name}</p>
                    <p>Devolver até: {activeLoan.dueDateFormatted}</p>
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
            </div>

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
      </div>
    </div>
  );
}
