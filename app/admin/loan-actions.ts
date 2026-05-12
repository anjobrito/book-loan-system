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
          reservations: {
            where: {
              status: "ACTIVE",
            },
            include: {
              user: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
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

  const nextReservation = loan.bookCopy.reservations[0];

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

    if (!nextReservation) {
      await tx.bookCopy.update({
        where: {
          id: loan.bookCopyId,
        },
        data: {
          status: "AVAILABLE",
        },
      });

      return;
    }

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 7);

    const newReminderDate = new Date(newDueDate);
    newReminderDate.setDate(newReminderDate.getDate() - 1);

    await tx.reservation.update({
      where: {
        id: nextReservation.id,
      },
      data: {
        status: "FULFILLED",
        notes: `${nextReservation.user.name} recebeu "${loan.bookCopy.book.title}" após a devolução de ${loan.borrower.name}.`,
      },
    });

    const newLoan = await tx.loan.create({
      data: {
        bookCopyId: loan.bookCopyId,
        borrowerId: nextReservation.userId,
        ownerId: loan.ownerId,
        dueDate: newDueDate,
        status: "ACTIVE",
      },
    });

    await tx.bookCopy.update({
      where: {
        id: loan.bookCopyId,
      },
      data: {
        status: "BORROWED",
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: newLoan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.ownerId,
        toUserId: nextReservation.userId,
        action: "RESERVATION_FULFILLED",
        notes: `Reserva atendida. "${loan.bookCopy.book.title}" foi entregue para ${nextReservation.user.name}.`,
      },
    });

    await tx.notification.create({
      data: {
        loanId: newLoan.id,
        userId: nextReservation.userId,
        type: "RETURN_REMINDER",
        subject: `Lembrete de devolução: ${loan.bookCopy.book.title}`,
        message: `Olá ${nextReservation.user.name}, sua reserva de "${loan.bookCopy.book.title}" foi atendida e agora o exemplar está com você. A data prevista de devolução é ${newDueDate.toLocaleDateString(
          "pt-BR"
        )}.`,
        scheduledFor: newReminderDate,
        status: "PENDING",
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: newLoan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.ownerId,
        toUserId: nextReservation.userId,
        action: "REMINDER_SCHEDULED",
        notes: `Lembrete automático agendado para ${nextReservation.user.name} após atendimento da reserva.`,
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
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${loan.bookCopyId}/history`);
}