import { requireAdmin } from "@/lib/admin";
import {
  FALLBACK_LOAN_DAYS,
  MIN_READING_DAYS,
  getActiveExchangeDates,
} from "@/lib/exchange-dates";
import { cancelExchangeDateAction, createExchangeDateAction } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(date);
}

export default async function AdminExchangeDatesPage() {
  await requireAdmin();
  const exchangeDates = await getActiveExchangeDates();

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Datas de troca</h1>
          <p className="mt-2 text-slate-300">
            Cadastre os encontros presenciais em que os funcionários poderão
            retirar e devolver livros.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold text-amber-300">Regra de prazo</h2>
          <div className="mt-4 space-y-3 leading-7 text-slate-300">
            <p>
              O sistema considera que o funcionário precisa de pelo menos {" "}
              <strong>{MIN_READING_DAYS} dias</strong> para ler o livro.
            </p>
            <p>
              Quando um empréstimo é criado, a devolução será marcada para a
              primeira data de troca cadastrada que esteja pelo menos {" "}
              <strong>{MIN_READING_DAYS} dias</strong> depois do empréstimo.
            </p>
            <p>
              Se não existir uma data de troca futura cadastrada, o sistema usa
              um prazo reserva de <strong>{FALLBACK_LOAN_DAYS} dias</strong>.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Cadastrar próximo encontro</h2>
          <p className="mt-2 text-slate-300">
            Informe a data do próximo encontro presencial da empresa. Cadastre
            também os próximos meses quando já souber as datas.
          </p>

          <form action={createExchangeDateAction} className="mt-6 grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Data do encontro
              </label>
              <input
                type="date"
                name="date"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Descrição opcional
              </label>
              <input
                type="text"
                name="description"
                placeholder="Ex.: Encontro mensal presencial"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300"
            >
              Cadastrar
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Próximas datas ativas</h2>

          {exchangeDates.length === 0 ? (
            <p className="mt-4 text-slate-300">
              Nenhuma data de troca cadastrada. Enquanto isso, novos empréstimos
              usarão o prazo reserva de {FALLBACK_LOAN_DAYS} dias.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {exchangeDates.map((exchangeDate) => (
                <article
                  key={exchangeDate.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-amber-300">
                        {formatDate(exchangeDate.date)}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {exchangeDate.description || "Encontro presencial para troca de livros"}
                      </p>
                    </div>

                    <form action={cancelExchangeDateAction}>
                      <input
                        type="hidden"
                        name="exchangeDateId"
                        value={exchangeDate.id}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-red-400/50 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Cancelar
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
