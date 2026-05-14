import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import EditBookForm from "./EditBookForm";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ bookCopyId: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { bookCopyId } = await params;

  const copy = await prisma.bookCopy.findUnique({
    where: {
      id: bookCopyId,
    },
    include: {
      book: true,
    },
  });

  if (!copy) {
    redirect("/books");
  }

  const canEdit = currentUser.role === "ADMIN" || copy.ownerId === currentUser.id;

  if (!canEdit) {
    redirect("/books");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:py-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl sm:p-8">
          <div className="mb-8 text-center">
            <p className="mx-auto mb-4 w-fit rounded-full border border-amber-400/40 px-4 py-2 text-sm text-amber-300">
              Editar cadastro
            </p>

            <h1 className="text-3xl font-bold md:text-4xl">
              Editar livro e exemplar
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              Atualize as informações da obra e do exemplar físico disponível
              para a Biblioteca Comunitária.
            </p>
          </div>

          <EditBookForm copy={copy} />
        </div>
      </section>
    </main>
  );
}
