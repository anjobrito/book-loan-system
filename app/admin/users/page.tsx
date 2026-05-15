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

function statusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "border-green-500/40 bg-green-500/10 text-green-300";
  }

  if (status === "BLOCKED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-red-500/40 bg-red-500/10 text-red-200";
}

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="min-h-[calc(100vh-57px)] bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="mt-2 text-slate-300">
            Gerencie os funcionários cadastrados na Biblioteca Comunitária.
          </p>
        </div>

        <div className="grid gap-4">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUser.id;
            const isApproved = user.accessStatus === "APPROVED";
            const isBlocked = user.accessStatus === "BLOCKED";
            const approveDisabled = isCurrentUser || isApproved;
            const blockDisabled = isCurrentUser || isBlocked;

            return (
              <article
                key={user.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{user.name}</h2>

                      {isCurrentUser && (
                        <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">
                          você
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                          user.accessStatus
                        )}`}
                      >
                        {statusLabel(user.accessStatus)}
                      </span>
                    </div>

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
                      <button
                        type="submit"
                        disabled={approveDisabled}
                        title={
                          isApproved
                            ? "Usuário já aprovado"
                            : isCurrentUser
                              ? "Você não pode alterar seu próprio status"
                              : "Aprovar usuário"
                        }
                        className={
                          approveDisabled
                            ? "cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                            : "rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                        }
                      >
                        {isApproved ? "Aprovado" : "Aprovar"}
                      </button>
                    </form>

                    <form action={blockUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        disabled={blockDisabled}
                        title={
                          isBlocked
                            ? "Usuário já bloqueado"
                            : isCurrentUser
                              ? "Você não pode alterar seu próprio status"
                              : "Bloquear usuário"
                        }
                        className={
                          blockDisabled
                            ? "cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                            : "rounded-xl border border-red-500 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10"
                        }
                      >
                        {isBlocked ? "Bloqueado" : "Bloquear"}
                      </button>
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
