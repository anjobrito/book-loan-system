"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { calculateLoanDueDate } from "@/lib/exchange-dates";
import { processLoanReturn } from "@/lib/loan-return";

export async function returnLoanAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const loanId = formData.get("loanId");

  if (typeof loanId !== "string" || loanId.trim().length === 0) {
    return;
  }

  const result = await processLoanReturn({ loanId });

  if (!result) {
    return;
  }

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${result.bookCopyId}/history`);
}

export async function renewLoanAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const loanId = formData.get("loanId");

  if (typeof loanId !== "string" || loanId.trim().length === 0) {
    return;
  }

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
          reservations: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
  });

  if (!loan) {
    return;
  }

  if (loan.status !== "ACTIVE") {
    return;
  }

  if (loan.bookCopy.reservations.length > 0) {
    await prisma.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.ownerId,
        toUserId: loan.borrowerId,
        action: "LOAN_RENEWAL_BLOCKED",
        notes: `Renovação bloqueada porque existe reserva ativa para "${loan.bookCopy.book.title}".`,
      },
    });

    revalidatePath("/books");
    revalidatePath("/admin");
    revalidatePath("/admin/loans");
    revalidatePath("/admin/reservations");
    revalidatePath(`/books/${loan.bookCopyId}/history`);

    return;
  }

  const oldDueDate = loan.dueDate;
  const newDueDate = await calculateLoanDueDate(loan.dueDate);

  const newReminderDate = new Date(newDueDate);
  newReminderDate.setDate(newReminderDate.getDate() - 1);

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: {
        id: loan.id,
      },
      data: {
        dueDate: newDueDate,
      },
    });

    await tx.notification.updateMany({
      where: {
        loanId: loan.id,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.notification.create({
      data: {
        loanId: loan.id,
        userId: loan.borrowerId,
        type: "RETURN_REMINDER",
        subject: `Lembrete de devolução: ${loan.bookCopy.book.title}`,
        message: `Olá ${loan.borrower.name}, seu empréstimo de "${loan.bookCopy.book.title}" foi renovado. A nova data prevista de devolução é ${newDueDate.toLocaleDateString(
          "pt-BR"
        )}. Caso precise renovar novamente, solicite antes do vencimento.`,
        scheduledFor: newReminderDate,
        status: "PENDING",
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.ownerId,
        toUserId: loan.borrowerId,
        action: "LOAN_RENEWED",
        notes: `Empréstimo renovado. Data anterior: ${oldDueDate.toLocaleDateString(
          "pt-BR"
        )}. Nova data: ${newDueDate.toLocaleDateString("pt-BR")}. Notificações pendentes anteriores foram canceladas.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${loan.bookCopyId}/history`);
}