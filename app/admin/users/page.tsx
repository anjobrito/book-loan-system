import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import {
  approveUserAction,
  blockUserAction,
  deleteUserAndBooksAction,
  demoteAdminToUserAction,
  promoteUserToAdminAction,
} from "./actions";

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
  const users = await prisma.user.findMany({
    include: {
      ownedCopies: true,
      borrowedLoans: {
        where: {
          status: "ACTIVE",
        },
      },
      reservations: {
        where: {
          status: "ACTIVE",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
            const isAdmin = user.role === "ADMIN";
            const approveDisabled = isCurrentUser || isApproved;
            const blockDisabled = isCurrentUser || isBlocked;
            const deleteDisabled = isCurrentUser;
            const roleDisabled = isCurrentUser;

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

                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                        {user.role}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-300">{user.email}</p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-4">
                      <p>Perfil: {user.role}</p>
                      <p>Status: {statusLabel(user.accessStatus)}</p>
                      <p>Cadastro: {formatDate(user.createdAt)}</p>
                      <p>Aprovação: {formatDate(user.approvedAt)}</p>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                      <p>Livros cadastrados: {user.ownedCopies.length}</p>
                      <p>Empréstimos ativos: {user.borrowedLoans.length}</p>
                      <p>Reservas ativas: {user.reservations.length}</p>
                    </div>

                    <p className="mt-4 max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                      Excluir usuário remove o cadastro, livros cadastrados por
                      ele, reservas, empréstimos relacionados, notificações e
                      histórico desses exemplares. Use apenas para limpeza de
                      cadastros/testes ou remoção definitiva.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80">
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
                            ? "w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                            : "w-full rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
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
                            ? "w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                            : "w-full rounded-xl border border-red-500 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10"
                        }
                      >
                        {isBlocked ? "Bloqueado" : "Bloquear"}
                      </button>
                    </form>

                    {isAdmin ? (
                      <form action={demoteAdminToUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <ConfirmSubmitButton
                          confirmMessage={`Confirma remover o perfil ADMIN de ${user.name}?`}
                          pendingLabel="Alterando..."
                          disabled={roleDisabled}
                          className={
                            roleDisabled
                              ? "w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                              : "w-full rounded-xl border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
                          }
                        >
                          Tornar usuário
                        </ConfirmSubmitButton>
                      </form>
                    ) : (
                      <form action={promoteUserToAdminAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <ConfirmSubmitButton
                          confirmMessage={`Confirma promover ${user.name} para ADMIN? Essa pessoa poderá aprovar, bloquear, excluir usuários e administrar o sistema.`}
                          pendingLabel="Promovendo..."
                          disabled={roleDisabled}
                          className={
                            roleDisabled
                              ? "w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                              : "w-full rounded-xl border border-red-500 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10"
                          }
                        >
                          Tornar admin
                        </ConfirmSubmitButton>
                      </form>
                    )}

                    <form action={deleteUserAndBooksAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`ATENÇÃO: confirma excluir definitivamente o usuário ${user.name}, seus livros cadastrados e todos os vínculos relacionados? Esta ação não pode ser desfeita.`}
                        pendingLabel="Excluindo..."
                        disabled={deleteDisabled}
                        className={
                          deleteDisabled
                            ? "w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-500 opacity-60"
                            : "w-full rounded-xl border border-red-600 bg-black px-4 py-2 font-semibold text-red-300 hover:bg-red-500/10"
                        }
                      >
                        Excluir
                      </ConfirmSubmitButton>
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
