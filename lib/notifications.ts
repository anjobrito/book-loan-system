import { prisma } from "@/lib/prisma";
import { sendReturnReminderEmail } from "@/lib/email";

export type ProcessNotificationResult = {
  processed: number;
  sent: number;
  failed: number;
};

export async function processPendingReturnNotifications(): Promise<ProcessNotificationResult> {
  const now = new Date();

  const notifications = await prisma.notification.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      user: true,
      loan: {
        include: {
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
    take: 25,
  });

  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      if (notification.type !== "RETURN_REMINDER") {
        await prisma.notification.update({
          where: {
            id: notification.id,
          },
          data: {
            status: "FAILED",
          },
        });

        failed += 1;
        continue;
      }

      if (notification.loan.status !== "ACTIVE") {
        await prisma.notification.update({
          where: {
            id: notification.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        continue;
      }

      await sendReturnReminderEmail({
        to: notification.user.email,
        userName: notification.user.name,
        bookTitle: notification.loan.bookCopy.book.title,
        bookCode: notification.loan.bookCopy.code,
        dueDate: notification.loan.dueDate,
        message: notification.message,
      });

      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await prisma.loanHistory.create({
        data: {
          loanId: notification.loanId,
          bookCopyId: notification.loan.bookCopyId,
          fromUserId: notification.loan.ownerId,
          toUserId: notification.userId,
          action: "REMINDER_SENT",
          notes: `E-mail de lembrete enviado para ${notification.user.name}.`,
        },
      });

      sent += 1;
    } catch (error) {
      console.error("Erro ao processar notificação:", {
        notificationId: notification.id,
        userId: notification.userId,
        email: notification.user.email,
        error,
      });

      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status: "FAILED",
        },
      });

      await prisma.loanHistory.create({
        data: {
          loanId: notification.loanId,
          bookCopyId: notification.loan.bookCopyId,
          fromUserId: notification.loan.ownerId,
          toUserId: notification.userId,
          action: "REMINDER_FAILED",
          notes: `Falha ao enviar e-mail de lembrete para ${notification.user.email}. Verifique logs da Vercel/Resend.`,
        },
      });

      failed += 1;
    }
  }

  return {
    processed: notifications.length,
    sent,
    failed,
  };
}
