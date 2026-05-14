import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { approveUserAction, blockUserAction } from "./actions";

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "-";
}

function statusLabel(status: string) {
  if (status === "APPROVED") return "Aprovado";
  if (status === "BLOCKED") return "Bloqueado";
  return "Pendente";
}

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="mt-2 text-slate-300">Gerencie os funcionários cadastrados na Biblioteca Comunitária.</p>
        </div>

        <div className="grid gap-4">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUser.id;
            return (
              <article key={user.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {user.name}
                      {isCurrentUser && <span className="ml-2 rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">você</span>}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                    <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-4">
                      <p>Perfil: {user.role}</p>
                      <p>Status: {statusLabel(user.accessStatus)}</p>
                      <p>Cadastro: {formatDate(user.createdAt)}</p>
                      <p>Aprovação: {formatDate(user.approvedAt)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <form action={approveUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" disabled={isCurrentUser || user.accessStatus === "APPROVED"} className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Aprovar</button>
                    </form>
                    <form action={blockUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" disabled={isCurrentUser || user.accessStatus === "BLOCKED"} className="rounded-xl border border-red-400/50 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500">Bloquear</button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
