import { prisma } from "@/lib/prisma";
import { calculateLoanDueDate } from "@/lib/exchange-dates";

export async function processLoanReturn({
  loanId,
  borrowerId,
}: {
  loanId: string;
  borrowerId?: string;
}) {
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

  if (!loan || loan.status !== "ACTIVE") {
    return null;
  }

  if (borrowerId && loan.borrowerId !== borrowerId) {
    return null;
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

    const newDueDate = await calculateLoanDueDate();
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
        message: `Olá ${nextReservation.user.name}, sua reserva de "${loan.bookCopy.book.title}" foi atendida e agora o exemplar está com você. A data prevista de devolução é ${newDueDate.toLocaleDateString("pt-BR")}.`,
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

  return {
    bookCopyId: loan.bookCopyId,
  };
}
