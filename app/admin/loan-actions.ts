"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function returnLoanAction(formData: FormData): Promise<void> {
  const loanId = formData.get("loanId");

  if (typeof loanId !== "string" || loanId.trim().length === 0) {
    return;
  }

  const loan = await prisma.loan.findUnique({
    where: {
      id: loanId,
    },
    include: {
      bookCopy: {
        include: {
          book: true,
        },
      },
      borrower: true,
      owner: true,
      notifications: true,
    },
  });

  if (!loan) {
    return;
  }

  if (loan.status !== "ACTIVE") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: {
        id: loan.id,
      },
      data: {
        status: "RETURNED",
        returnDate: new Date(),
      },
    });

    await tx.bookCopy.update({
      where: {
        id: loan.bookCopyId,
      },
      data: {
        status: "AVAILABLE",
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

    await tx.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.borrowerId,
        toUserId: loan.ownerId,
        action: "RETURNED",
        notes: `${loan.borrower.name} devolveu "${loan.bookCopy.book.title}" para ${loan.owner.name}. Notificações pendentes foram canceladas.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
  revalidatePath(`/books/${loan.bookCopyId}/history`);
}

export async function renewLoanAction(formData: FormData): Promise<void> {
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

  const oldDueDate = loan.dueDate;

  const newDueDate = new Date(loan.dueDate);
  newDueDate.setDate(newDueDate.getDate() + 7);

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
  revalidatePath(`/books/${loan.bookCopyId}/history`);
}