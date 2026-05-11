import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type HistoryPageProps = {
  params: Promise<{
    copyId: string;
  }>;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getActionLabel(action: string) {
  if (action === "LOAN_CREATED") {
    return "Empréstimo criado";
  }

  if (action === "RETURNED") {
    return "Devolução registrada";
  }

  if (action === "LOAN_RENEWED") {
    return "Empréstimo renovado";
  }

  if (action === "DUE_DATE_CHANGED") {
    return "Data de devolução alterada";
  }

  if (action === "REMINDER_SCHEDULED") {
    return "Lembrete agendado";
  }

  if (action === "REMINDER_SENT") {
    return "Lembrete enviado";
  }

  if (action === "CANCELLED") {
    return "Empréstimo cancelado";
  }

  return action;
}

function getStatusLabel(status: string) {
  if (status === "AVAILABLE") {
    return "Disponível";
  }

  if (status === "BORROWED") {
    return "Emprestado";
  }

  if (status === "RESERVED") {
    return "Reservado";
  }

  if (status === "LOST") {
    return "Perdido";
  }

  if (status === "INACTIVE") {
    return "Inativo";
  }

  return status;
}

export default async function BookCopyHistoryPage({ params }: HistoryPageProps) {
  const { copyId } = await params;

  const copy = await prisma.bookCopy.findUnique({
    where: {
      id: copyId,
    },
    include: {
      book: true,
      owner: true,
      history: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          loan: {
            include: {
              borrower: true,
              owner: true,
            },
          },
        },
      },
      loans: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          borrower: true,
          owner: true,
        },
      },
    },
  });

  if (!copy) {
    notFound();
  }

  const activeLoan = copy.loans.find((loan) => loan.status === "ACTIVE");

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {copy.book.type}
                </p>

                <h1 className="mt-2 text-3xl font-bold">{copy.book.title}</h1>

                <p className="mt-3 max-w-3xl text-slate-300">
                  {copy.book.synopsis ?? "Sem sinopse cadastrada."}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                  copy.status === "AVAILABLE"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {getStatusLabel(copy.status)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Código do exemplar</p>
                <p className="mt-1 font-semibold text-white">{copy.code}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Dono</p>
                <p className="mt-1 font-semibold text-white">
                  {copy.owner.name}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Estado físico</p>
                <p className="mt-1 font-semibold text-white">
                  {copy.condition ?? "Não informado"}
                </p>
              </div>
            </div>

            {activeLoan && (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="font-semibold text-amber-300">
                  Empréstimo ativo
                </p>

                <div className="mt-2 grid gap-2 text-sm text-amber-100 md:grid-cols-3">
                  <p>Com: {activeLoan.borrower.name}</p>
                  <p>Desde: {formatDate(activeLoan.loanDate)}</p>
                  <p>Devolver até: {formatDate(activeLoan.dueDate)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow">
          <h2 className="text-2xl font-bold">Histórico do exemplar</h2>

          <p className="mt-2 text-slate-300">
            Registro completo de movimentações desse exemplar.
          </p>

          {copy.history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-300">
                Esse exemplar ainda não possui movimentações registradas.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Ação</th>
                      <th className="px-4 py-3">Dono</th>
                      <th className="px-4 py-3">Participante</th>
                      <th className="px-4 py-3">Observação</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {copy.history.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                            {getActionLabel(item.action)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.loan.owner.name}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.loan.borrower.name}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.notes ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}