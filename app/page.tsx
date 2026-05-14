import Link from "next/link";

const featureCards = [
  {
    title: "Catálogo visual",
    description:
      "Organize livros, comics e mangás com capa, sinopse, autor, gênero e dados do exemplar.",
  },
  {
    title: "Controle de empréstimos",
    description:
      "Acompanhe quem está com cada exemplar, prazo de devolução e status atualizado.",
  },
  {
    title: "Reservas inteligentes",
    description:
      "Permita fila de reserva para exemplares emprestados e evite conflitos de renovação.",
  },
  {
    title: "Notificações por e-mail",
    description:
      "Agende lembretes de devolução e acompanhe notificações pendentes, enviadas ou com falha.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Cadastre o exemplar",
    description:
      "Informe os dados da obra, dono, código físico, estado de conservação e URL da capa.",
  },
  {
    number: "02",
    title: "Usuários solicitam",
    description:
      "O catálogo mostra disponibilidade e permite solicitar empréstimo ou entrar na fila de reserva.",
  },
  {
    number: "03",
    title: "Admin acompanha tudo",
    description:
      "O painel administrativo centraliza empréstimos, reservas, atrasos, histórico e notificações.",
  },
];

const showcaseItems = [
  "Capas no catálogo",
  "Accordion de detalhes",
  "Reservas ativas",
  "Histórico de empréstimos",
  "Lembretes automáticos",
];

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-57px)] max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <p className="mb-5 w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
            Sistema de Empréstimos
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Controle sua biblioteca com empréstimos, reservas e capas no
            catálogo.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            O Book Loan System organiza livros, comics e mangás em um fluxo
            simples: cadastro do exemplar, solicitação de empréstimo, fila de
            reserva, histórico e lembretes de devolução.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/books"
              className="rounded-xl bg-amber-400 px-6 py-3 text-center font-semibold text-slate-950 no-underline hover:bg-amber-300"
            >
              Ver catálogo
            </Link>

            <Link
              href="/books/new"
              className="rounded-xl border border-slate-600 px-6 py-3 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Cadastrar livro
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-600 px-6 py-3 text-center font-semibold text-white no-underline hover:bg-slate-800"
            >
              Painel administrativo
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-bold text-amber-300">3</p>
              <p className="mt-1 text-sm text-slate-300">tipos de obra</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-bold text-amber-300">7 dias</p>
              <p className="mt-1 text-sm text-slate-300">prazo padrão</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-2xl font-bold text-amber-300">Mobile</p>
              <p className="mt-1 text-sm text-slate-300">layout responsivo</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-300">BOOK</p>
                <h2 className="mt-2 text-2xl font-bold">O Iluminado</h2>
              </div>

              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                Disponível
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="flex h-52 items-center justify-center rounded-xl border border-slate-700 bg-gradient-to-br from-amber-300 via-amber-500 to-slate-900 p-4 text-center text-lg font-black text-slate-950 shadow">
                CAPA
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  Catálogo moderno com imagem, status de disponibilidade e
                  detalhes organizados.
                </p>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <p className="font-semibold text-amber-300">
                    Ver detalhes do exemplar
                  </p>
                  <p className="mt-2">Autor, gênero, código, estado e dono.</p>
                </div>

                <button className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950">
                  Solicitar empréstimo
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <div className="flex snap-x gap-3">
              {showcaseItems.map((item) => (
                <div
                  key={item}
                  className="min-w-44 snap-start rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="text-lg font-bold text-amber-300">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Como funciona
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                Do cadastro ao histórico completo
              </h2>
            </div>

            <Link
              href="/books"
              className="w-full rounded-xl border border-slate-600 px-5 py-3 text-center font-semibold text-white no-underline hover:bg-slate-800 md:w-fit"
            >
              Explorar catálogo
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
              >
                <p className="text-sm font-bold text-amber-300">
                  {step.number}
                </p>
                <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}