import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const allPendingNotifications = await prisma.notification.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      user: true,
      loan: {
        include: {
          borrower: true,
          owner: true,
          bookCopy: {
            include: {
              book: true,
            },
          },
        },
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });

  const dueNotifications = allPendingNotifications.filter((notification) => {
    return (
      notification.scheduledFor <= now &&
      notification.loan.status === "ACTIVE"
    );
  });

  const futureNotifications = allPendingNotifications.filter((notification) => {
    return notification.scheduledFor > now;
  });

  const inactiveLoanNotifications = allPendingNotifications.filter(
    (notification) => {
      return (
        notification.scheduledFor <= now &&
        notification.loan.status !== "ACTIVE"
      );
    }
  );

  const processed = [];

  for (const notification of dueNotifications) {
    console.log("======================================");
    console.log("SIMULAÇÃO DE ENVIO DE E-MAIL");
    console.log("Para:", notification.user.email);
    console.log("Nome:", notification.user.name);
    console.log("Assunto:", notification.subject);
    console.log("Mensagem:", notification.message);
    console.log("Livro:", notification.loan.bookCopy.book.title);
    console.log("Código:", notification.loan.bookCopy.code);
    console.log(
      "Devolver até:",
      notification.loan.dueDate.toLocaleDateString("pt-BR")
    );
    console.log("======================================");

    await prisma.$transaction(async (tx) => {
      await tx.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await tx.loanHistory.create({
        data: {
          loanId: notification.loanId,
          bookCopyId: notification.loan.bookCopyId,
          fromUserId: notification.loan.ownerId,
          toUserId: notification.userId,
          action: "REMINDER_SENT",
          notes: `Lembrete de devolução enviado para ${notification.user.email}.`,
        },
      });
    });

    processed.push({
      notificationId: notification.id,
      email: notification.user.email,
      book: notification.loan.bookCopy.book.title,
    });
  }

  return NextResponse.json({
    success: true,
    now: now.toISOString(),
    pendingTotal: allPendingNotifications.length,
    futurePendingCount: futureNotifications.length,
    duePendingWithActiveLoanCount: dueNotifications.length,
    duePendingWithInactiveLoanCount: inactiveLoanNotifications.length,
    processedCount: processed.length,
    processed,
    futurePendingPreview: futureNotifications.map((notification) => ({
      id: notification.id,
      scheduledFor: notification.scheduledFor.toISOString(),
      loanStatus: notification.loan.status,
      book: notification.loan.bookCopy.book.title,
      user: notification.user.email,
    })),
  });
}