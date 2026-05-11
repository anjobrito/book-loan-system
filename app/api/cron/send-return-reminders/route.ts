import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReturnReminderEmail } from "@/lib/email";

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
  const failed = [];

  for (const notification of dueNotifications) {
    try {
      const emailResult = await sendReturnReminderEmail({
        to: notification.user.email,
        userName: notification.user.name,
        bookTitle: notification.loan.bookCopy.book.title,
        bookCode: notification.loan.bookCopy.code,
        dueDate: notification.loan.dueDate,
        message: notification.message,
      });

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
            notes: `Lembrete de devolução enviado por e-mail para ${notification.user.email}.`,
          },
        });
      });

      processed.push({
        notificationId: notification.id,
        email: notification.user.email,
        book: notification.loan.bookCopy.book.title,
        resendResult: emailResult,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: "FAILED",
        },
      });

      failed.push({
        notificationId: notification.id,
        email: notification.user.email,
        book: notification.loan.bookCopy.book.title,
        error: errorMessage,
      });
    }
  }

  return NextResponse.json({
    success: true,
    now: now.toISOString(),
    pendingTotal: allPendingNotifications.length,
    futurePendingCount: futureNotifications.length,
    duePendingWithActiveLoanCount: dueNotifications.length,
    duePendingWithInactiveLoanCount: inactiveLoanNotifications.length,
    processedCount: processed.length,
    failedCount: failed.length,
    processed,
    failed,
    futurePendingPreview: futureNotifications.map((notification) => ({
      id: notification.id,
      scheduledFor: notification.scheduledFor.toISOString(),
      loanStatus: notification.loan.status,
      book: notification.loan.bookCopy.book.title,
      user: notification.user.email,
    })),
  });
}