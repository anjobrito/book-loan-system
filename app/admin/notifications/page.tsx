import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getNotificationStatusLabel(status: string) {
  if (status === "PENDING") {
    return "Pendente";
  }

  if (status === "SENT") {
    return "Enviada";
  }

  if (status === "FAILED") {
    return "Falhou";
  }

  if (status === "CANCELLED") {
    return "Cancelada";
  }

  return status;
}

export default async function AdminNotificationsPage() {
  await requireAdmin();

  const notifications = await prisma.notification.findMany({
    include: {
      user: true,
      loan: {
        include: {
          bookCopy: {
            include: {
              book: true,
            },
          },
          borrower: true,
          owner: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notificações</h1>

            <p className="mt-2 text-slate-300">
              Lembretes de devolução agendados pelo administrador.
            </p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">
              Nenhuma notificação agendada ainda.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Livro</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Assunto</th>
                    <th className="px-4 py-3">Agendada para</th>
                    <th className="px-4 py-3">Enviada em</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {notifications.map((notification) => (
                    <tr key={notification.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {notification.loan.bookCopy.book.title}
                        </p>

                        <p className="text-xs text-slate-400">
                          Código: {notification.loan.bookCopy.code}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        <p>{notification.user.name}</p>
                        <p className="text-xs text-slate-500">
                          {notification.user.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        <p>{notification.subject}</p>
                        <p className="mt-1 max-w-xl text-xs text-slate-500">
                          {notification.message}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatDate(notification.scheduledFor)}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatDate(notification.sentAt)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            notification.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-300"
                              : notification.status === "SENT"
                                ? "bg-green-500/20 text-green-300"
                                : notification.status === "CANCELLED"
                                  ? "bg-slate-700 text-slate-300"
                                  : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {getNotificationStatusLabel(notification.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}