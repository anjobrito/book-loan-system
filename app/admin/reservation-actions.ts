"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function cancelReservationAction(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const reservationId = formData.get("reservationId");

  if (
    typeof reservationId !== "string" ||
    reservationId.trim().length === 0
  ) {
    return;
  }

  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId,
    },
    include: {
      user: true,
      bookCopy: {
        include: {
          book: true,
          owner: true,
          loans: {
            where: {
              status: "ACTIVE",
            },
            include: {
              borrower: true,
              owner: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!reservation) {
    return;
  }

  if (reservation.status !== "ACTIVE") {
    return;
  }

  const activeLoan = reservation.bookCopy.loans[0];

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: "CANCELLED",
        notes: `Reserva de ${reservation.user.name} para "${reservation.bookCopy.book.title}" foi cancelada pelo administrador.`,
      },
    });

    if (activeLoan) {
      await tx.loanHistory.create({
        data: {
          loanId: activeLoan.id,
          bookCopyId: reservation.bookCopyId,
          fromUserId: reservation.userId,
          toUserId: reservation.bookCopy.ownerId,
          action: "RESERVATION_CANCELLED",
          notes: `Reserva de ${reservation.user.name} para "${reservation.bookCopy.book.title}" foi cancelada pelo administrador.`,
        },
      });
    }
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${reservation.bookCopyId}/history`);
}