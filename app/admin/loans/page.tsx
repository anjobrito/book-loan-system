import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { returnLoanAction } from "../loan-actions";

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
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
  const loans = await prisma.loan.findMany({
    include: {
      borrower: true,
      owner: true,
      bookCopy: {
        include: {
          book: true,
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
            <h1 className="text-3xl font-bold">Empréstimos</h1>

            <p className="mt-2 text-slate-300">
              Controle de livros emprestados, responsáveis e devoluções.
            </p>
          </div>

          <Link
            href="/books"
            className="rounded-xl bg-amber-400 px-5 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
          >
            Voltar ao catálogo
          </Link>
        </div>

        {loans.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-300">
              Nenhum empréstimo registrado ainda.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Livro</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Dono</th>
                    <th className="px-4 py-3">Com quem está</th>
                    <th className="px-4 py-3">Empréstimo</th>
                    <th className="px-4 py-3">Devolver até</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {loans.map((loan) => {
                    const isActive = loan.status === "ACTIVE";

                    return (
                      <tr key={loan.id} className="align-middle">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-white">
                              {loan.bookCopy.book.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {loan.bookCopy.book.type} ·{" "}
                              {loan.bookCopy.book.genre}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {loan.bookCopy.code}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {loan.owner.name}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {loan.borrower.name}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(loan.loanDate)}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {formatDate(loan.dueDate)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {getLoanStatusLabel(loan.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          {isActive ? (
                            <form action={returnLoanAction}>
                              <input
                                type="hidden"
                                name="loanId"
                                value={loan.id}
                              />

                              <button
                                type="submit"
                                className="rounded-xl bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-400"
                              >
                                Registrar devolução
                              </button>
                            </form>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Finalizado
                            </span>
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