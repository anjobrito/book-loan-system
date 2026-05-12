import { prisma } from "@/lib/prisma";
import { cancelReservationAction } from "../reservation-actions";

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getReservationStatusLabel(status: string) {
  if (status === "ACTIVE") {
    return "Ativa";
  }

  if (status === "CANCELLED") {
    return "Cancelada";
  }

  if (status === "FULFILLED") {
    return "Atendida";
  }

  return status;
}

export default async function AdminReservationsPage() {
  const reservations = await prisma.reservation.findMany({
    include: {
      user: true,
      bookCopy: {
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reservas</h1>

            <p className="mt-2 text-slate-300">
              Fila de usuários aguardando exemplares que estão emprestados.
            </p>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">Nenhuma reserva registrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Livro</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Solicitante</th>
                    <th className="px-4 py-3">Dono</th>
                    <th className="px-4 py-3">Com quem está</th>
                    <th className="px-4 py-3">Criada em</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {reservations.map((reservation) => {
                    const activeLoan = reservation.bookCopy.loans[0];
                    const isActive = reservation.status === "ACTIVE";

                    return (
                      <tr key={reservation.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-white">
                            {reservation.bookCopy.book.title}
                          </p>

                          <p className="text-xs text-slate-400">
                            {reservation.bookCopy.book.type}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {reservation.bookCopy.code}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          <p>{reservation.user.name}</p>
                          <p className="text-xs text-slate-500">
                            {reservation.user.email}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {reservation.bookCopy.owner.name}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {activeLoan ? activeLoan.borrower.name : "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(reservation.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              reservation.status === "ACTIVE"
                                ? "bg-amber-500/20 text-amber-300"
                                : reservation.status === "FULFILLED"
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {getReservationStatusLabel(reservation.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {isActive ? (
                            <form action={cancelReservationAction}>
                              <input
                                type="hidden"
                                name="reservationId"
                                value={reservation.id}
                              />

                              <button
                                type="submit"
                                className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400"
                              >
                                Cancelar reserva
                              </button>
                            </form>
                          ) : (
                            <button
                              disabled
                              className="cursor-not-allowed rounded-xl bg-slate-700 px-4 py-2 font-semibold text-slate-400"
                            >
                              Sem ação
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}