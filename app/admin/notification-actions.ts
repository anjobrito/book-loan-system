"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function getRequiredString(formData: FormData, field: string): string {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Campo obrigatório ausente: ${field}`);
  }

  return value.trim();
}

export async function createReturnReminderAction(
  formData: FormData
): Promise<void> {
  try {
    console.log("createReturnReminderAction chamada");

    const loanId = getRequiredString(formData, "loanId");
    const scheduledForValue = getRequiredString(formData, "scheduledFor");
    const message = getRequiredString(formData, "message");

    console.log("loanId recebido:", loanId);
    console.log("scheduledFor recebido:", scheduledForValue);
    console.log("message recebido:", message);

    const loan = await prisma.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        borrower: true,
        owner: true,
        bookCopy: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!loan) {
      console.log("Empréstimo não encontrado.");
      return;
    }

    if (loan.status !== "ACTIVE") {
      console.log("Empréstimo não está ativo:", loan.status);
      return;
    }

    const scheduledFor = new Date(scheduledForValue);

    if (Number.isNaN(scheduledFor.getTime())) {
      console.log("Data inválida:", scheduledForValue);
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          loanId: loan.id,
          userId: loan.borrowerId,
          type: "RETURN_REMINDER",
          subject: `Lembrete de devolução: ${loan.bookCopy.book.title}`,
          message,
          scheduledFor,
          status: "PENDING",
        },
      });

      await tx.loanHistory.create({
        data: {
          loanId: loan.id,
          bookCopyId: loan.bookCopyId,
          fromUserId: loan.ownerId,
          toUserId: loan.borrowerId,
          action: "REMINDER_SCHEDULED",
          notes: `Lembrete de devolução agendado para ${loan.borrower.name}.`,
        },
      });
    });

    console.log("Notificação criada com sucesso.");

    revalidatePath("/admin/loans");
    revalidatePath("/admin/notifications");
    revalidatePath(`/books/${loan.bookCopyId}/history`);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
}