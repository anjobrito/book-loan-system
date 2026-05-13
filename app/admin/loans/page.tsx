import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { renewLoanAction, returnLoanAction } from "../loan-actions";
import { createReturnReminderAction } from "../notification-actions";

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function getLoanStatusLabel(status: string) {
  if (status === "ACTIVE") {
    return "Ativo";
  }

  if (status === "RETURNED") {
    return "Devolvido";
  }

  if (status === "LATE") {
    return "Atrasado";
  }

  if (status === "CANCELLED") {
    return "Cancelado";
  }

  return status;
}

export default async function AdminLoansPage() {
  await requireAdmin();

  const loans = await prisma.loan.findMany({
    include: {
      borrower: true,
      owner: true,
      bookCopy: {
        include: {
          book: true,
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
      },
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const defaultReminderDate = new Date();
  defaultReminderDate.setDate(defaultReminderDate.getDate() + 1);

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Empréstimos</h1>

            <p className="mt-2 text-slate-300">
              Controle de livros emprestados, responsáveis, renovações,
              lembretes e devoluções.
            </p>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">
              Nenhum empréstimo registrado ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {loans.map((loan) => {
              const isActive = loan.status === "ACTIVE";
              const hasActiveReservations =
                loan.bookCopy.reservations.length > 0;

              const pendingNotifications = loan.notifications.filter(
                (notification) => notification.status === "PENDING"
              );

              const sentNotifications = loan.notifications.filter(
                (notification) => notification.status === "SENT"
              );

              const cancelledNotifications = loan.notifications.filter(
                (notification) => notification.status === "CANCELLED"
              );

              return (
                <article
                  key={loan.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow sm:p-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold">
                          {loan.bookCopy.book.title}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isActive
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {getLoanStatusLabel(loan.status)}
                        </span>

                        {hasActiveReservations && (
                          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                            Possui reserva ativa
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                        <p>
                          <span className="text-slate-500">Código:</span>{" "}
                          {loan.bookCopy.code}
                        </p>

                        <p>
                          <span className="text-slate-500">Dono:</span>{" "}
                          {loan.owner.name}
                        </p>

                        <p>
                          <span className="text-slate-500">Com:</span>{" "}
                          {loan.borrower.name}
                        </p>

                        <p>
                          <span className="text-slate-500">Empréstimo:</span>{" "}
                          {formatDate(loan.loanDate)}
                        </p>

                        <p>
                          <span className="text-slate-500">Devolver até:</span>{" "}
                          {formatDate(loan.dueDate)}
                        </p>

                        <p>
                          <span className="text-slate-500">
                            Notificações pendentes:
                          </span>{" "}
                          {pendingNotifications.length}
                        </p>

                        <p>
                          <span className="text-slate-500">
                            Notificações enviadas:
                          </span>{" "}
                          {sentNotifications.length}
                        </p>

                        <p>
                          <span className="text-slate-500">
                            Notificações canceladas:
                          </span>{" "}
                          {cancelledNotifications.length}
                        </p>

                        <p>
                          <span className="text-slate-500">
                            Reservas ativas:
                          </span>{" "}
                          {loan.bookCopy.reservations.length}
                        </p>
                      </div>

                      {hasActiveReservations && (
                        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                          <p className="font-semibold">
                            Renovação bloqueada por reserva ativa.
                          </p>

                          <p className="mt-1">
                            Primeiro da fila:{" "}
                            {loan.bookCopy.reservations[0].user.name}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 lg:w-72">
                      <Link
                        href={`/books/${loan.bookCopyId}/history`}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-center font-semibold text-white no-underline hover:bg-slate-800"
                      >
                        Ver histórico
                      </Link>

                      {isActive ? (
                        <div className="space-y-3">
                          {hasActiveReservations ? (
                            <button
                              disabled
                              className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                            >
                              Renovação bloqueada
                            </button>
                          ) : (
                            <form action={renewLoanAction}>
                              <input
                                type="hidden"
                                name="loanId"
                                value={loan.id}
                              />

                              <button
                                type="submit"
                                className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
                              >
                                Renovar +7 dias
                              </button>
                            </form>
                          )}

                          <form action={returnLoanAction}>
                            <input
                              type="hidden"
                              name="loanId"
                              value={loan.id}
                            />

                            <button
                              type="submit"
                              className="w-full rounded-xl bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-400"
                            >
                              Registrar devolução
                            </button>
                          </form>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                        >
                          Finalizado
                        </button>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <form
                      action={createReturnReminderAction}
                      className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <input type="hidden" name="loanId" value={loan.id} />

                      <h3 className="font-semibold text-amber-300">
                        Agendar lembrete manual
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        O sistema já cria lembrete automático no empréstimo e na
                        renovação. Use este formulário apenas para lembretes
                        adicionais.
                      </p>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Data de envio
                          </label>

                          <input
                            type="datetime-local"
                            name="scheduledFor"
                            required
                            defaultValue={toDateTimeLocalValue(
                              defaultReminderDate
                            )}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-300">
                            Mensagem
                          </label>

                          <input
                            name="message"
                            required
                            defaultValue={`Olá ${loan.borrower.name}, lembrete para devolver "${loan.bookCopy.book.title}" até ${formatDate(
                              loan.dueDate
                            )}.`}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
                          >
                            Agendar
                          </button>
                        </div>
                      </div>
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