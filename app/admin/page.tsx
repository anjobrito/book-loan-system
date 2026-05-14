import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPage() {
  await requireAdmin();

  const now = new Date();

  const [
    usersCount,
    activeLoansCount,
    booksCount,
    bookCopiesCount,
    activeReservationsCount,
    pendingNotificationsCount,
    lateLoansCount,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.loan.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.book.count(),

    prisma.bookCopy.count(),

    prisma.reservation.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.notification.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.loan.count({
      where: {
        status: "ACTIVE",
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>

        <p className="mt-2 text-slate-300">
          Aqui o administrador poderá controlar usuários, empréstimos,
          devoluções, reservas e notificações por e-mail.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Usuários cadastrados</p>
            <strong className="mt-2 block text-4xl text-amber-300">
              {usersCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Empréstimos ativos</p>
            <strong className="mt-2 block text-4xl text-amber-300">
              {activeLoansCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Livros cadastrados</p>
            <strong className="mt-2 block text-4xl text-amber-300">
              {booksCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Exemplares cadastrados</p>
            <strong className="mt-2 block text-4xl text-amber-300">
              {bookCopiesCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Reservas ativas</p>
            <strong className="mt-2 block text-4xl text-amber-300">
              {activeReservationsCount}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Atrasados</p>
            <strong className="mt-2 block text-4xl text-red-400">
              {lateLoansCount}
            </strong>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow">
          <h2 className="text-2xl font-bold">Acesso rápido</h2>

          <p className="mt-2 text-slate-300">
            Use os atalhos abaixo para administrar as principais áreas do
            sistema.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              href="/admin/users"
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Usuários
            </Link>

            <Link
              href="/admin/loans"
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Empréstimos
            </Link>

            <Link
              href="/admin/reservations"
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Reservas
            </Link>

            <Link
              href="/admin/notifications"
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Notificações
            </Link>

            <Link
              href="/books"
              className="rounded-2xl bg-amber-400 p-5 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
            >
              Catálogo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
