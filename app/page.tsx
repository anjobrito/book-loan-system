const howItWorks = [
  {
    title: "1. O funcionário cadastra um livro",
    description:
      "Cada pessoa pode disponibilizar um livro, comic ou mangá próprio para que outros colegas possam encontrar no catálogo da biblioteca comunitária.",
  },
  {
    title: "2. Outro funcionário solicita o empréstimo",
    description:
      "Quando o exemplar estiver disponível, o interessado solicita o empréstimo pelo sistema. Se ele já estiver emprestado, pode entrar na fila de reserva.",
  },
  {
    title: "3. O sistema organiza o controle",
    description:
      "O sistema registra quem é o dono, quem está com o livro, a data prevista de devolução, reservas e histórico de movimentação.",
  },
];

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mx-auto mb-5 w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
              Biblioteca comunitária da empresa
            </p>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Compartilhe livros com seus colegas de trabalho.
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Este espaço foi criado para que os funcionários possam emprestar,
              reservar e trocar livros entre si de forma organizada, simples e
              segura. A ideia é incentivar a leitura dentro da empresa e
              facilitar o controle dos exemplares compartilhados.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6">
            <h2 className="text-2xl font-bold text-amber-300">
              Como funciona
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {howItWorks.map((step) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6">
              <h2 className="text-xl font-bold text-amber-300">
                Para quem empresta
              </h2>
              <p className="mt-3 leading-7 text-slate-300">
                Você cadastra seu exemplar, informa o estado de conservação e
                continua sendo identificado como dono do livro. Assim, todos
                sabem a quem o exemplar pertence.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 md:p-6">
              <h2 className="text-xl font-bold text-amber-300">
                Para quem quer ler
              </h2>
              <p className="mt-3 leading-7 text-slate-300">
                Você consulta o catálogo, verifica a disponibilidade e solicita
                o empréstimo. Quando o livro estiver com outra pessoa, é
                possível reservar e aguardar sua vez.
              </p>
            </section>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 md:p-6">
            <h2 className="text-xl font-bold text-amber-300">
              Uma biblioteca feita pela comunidade
            </h2>
            <p className="mt-3 leading-7 text-slate-200">
              O objetivo não é substituir uma biblioteca tradicional, mas criar
              um ambiente colaborativo onde cada funcionário pode contribuir com
              seus próprios livros e ajudar outros colegas a descobrir novas
              leituras.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}