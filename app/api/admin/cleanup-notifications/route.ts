import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const staleNotifications = await prisma.notification.findMany({
    where: {
      status: "PENDING",
      loan: {
        status: {
          not: "ACTIVE",
        },
      },
    },
    include: {
      loan: {
        include: {
          bookCopy: {
            include: {
              book: true,
            },
          },
        },
      },
      user: true,
    },
  });

  const result = await prisma.notification.updateMany({
    where: {
      status: "PENDING",
      loan: {
        status: {
          not: "ACTIVE",
        },
      },
    },
    data: {
      status: "CANCELLED",
    },
  });

  return NextResponse.json({
    success: true,
    cancelledCount: result.count,
    cancelled: staleNotifications.map((notification) => ({
      id: notification.id,
      user: notification.user.email,
      book: notification.loan.bookCopy.book.title,
      loanStatus: notification.loan.status,
      oldStatus: notification.status,
      newStatus: "CANCELLED",
    })),
  });
}