import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import BookCatalogClient, { BookCatalogCopy } from "./BookCatalogClient";

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

  const catalogCopies: BookCatalogCopy[] = copies.map((copy) => {
    const activeLoan = copy.loans[0];

    return {
      id: copy.id,
      bookId: copy.bookId,
      ownerId: copy.ownerId,
      code: copy.code,
      status: copy.status,
      condition: copy.condition,
      book: {
        id: copy.book.id,
        title: copy.book.title,
        type: copy.book.type,
        synopsis: copy.book.synopsis,
        edition: copy.book.edition,
        publicationYear: copy.book.publicationYear,
        publisher: copy.book.publisher,
        author: copy.book.author,
        genre: copy.book.genre,
        imageUrl: copy.book.imageUrl,
      },
      owner: {
        id: copy.owner.id,
        name: copy.owner.name,
      },
      activeLoan: activeLoan
        ? {
            id: activeLoan.id,
            borrowerId: activeLoan.borrowerId,
            dueDateFormatted: formatDate(activeLoan.dueDate),
            borrower: {
              id: activeLoan.borrower.id,
              name: activeLoan.borrower.name,
            },
          }
        : null,
      reservations: copy.reservations.map((reservation) => ({
        id: reservation.id,
        userId: reservation.userId,
        user: {
          id: reservation.user.id,
          name: reservation.user.name,
        },
      })),
    };
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

        {catalogCopies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">Nenhum livro cadastrado ainda.</p>
          </div>
        ) : (
          <BookCatalogClient
            copies={catalogCopies}
            currentUser={
              currentUser
                ? {
                    id: currentUser.id,
                    name: currentUser.name,
                    role: currentUser.role,
                  }
                : null
            }
          />
        )}
      </section>
    </main>
  );
}
