"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

async function updateUserAccessStatus(
  userId: FormDataEntryValue | null,
  accessStatus: string
) {
  const currentUser = await requireAdmin();

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return;
  }

  if (currentUser.id === userId) {
    return;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      accessStatus,
      approvedAt: accessStatus === "APPROVED" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

async function updateUserRole(userId: FormDataEntryValue | null, role: "ADMIN" | "USER") {
  const currentUser = await requireAdmin();

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return;
  }

  if (currentUser.id === userId) {
    return;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
      accessStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function approveUserAction(formData: FormData): Promise<void> {
  await updateUserAccessStatus(formData.get("userId"), "APPROVED");
}

export async function blockUserAction(formData: FormData): Promise<void> {
  await updateUserAccessStatus(formData.get("userId"), "BLOCKED");
}

export async function promoteUserToAdminAction(formData: FormData): Promise<void> {
  await updateUserRole(formData.get("userId"), "ADMIN");
}

export async function demoteAdminToUserAction(formData: FormData): Promise<void> {
  await updateUserRole(formData.get("userId"), "USER");
}

export async function deleteUserAndBooksAction(formData: FormData): Promise<void> {
  const currentUser = await requireAdmin();
  const userId = formData.get("userId");

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return;
  }

  if (currentUser.id === userId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      ownedCopies: {
        select: {
          id: true,
          bookId: true,
        },
      },
    },
  });

  if (!user) {
    return;
  }

  const ownedCopyIds = user.ownedCopies.map((copy) => copy.id);
  const ownedBookIds = [...new Set(user.ownedCopies.map((copy) => copy.bookId))];

  const affectedLoans = await prisma.loan.findMany({
    where: {
      OR: [
        { borrowerId: userId },
        { ownerId: userId },
        ownedCopyIds.length > 0
          ? {
              bookCopyId: {
                in: ownedCopyIds,
              },
            }
          : { id: "__NO_OWNED_COPY__" },
      ],
    },
    select: {
      id: true,
      bookCopyId: true,
      borrowerId: true,
      ownerId: true,
      status: true,
    },
  });

  const affectedLoanIds = affectedLoans.map((loan) => loan.id);
  const borrowedCopyIdsToRelease = affectedLoans
    .filter(
      (loan) =>
        loan.borrowerId === userId &&
        loan.status === "ACTIVE" &&
        !ownedCopyIds.includes(loan.bookCopyId)
    )
    .map((loan) => loan.bookCopyId);

  await prisma.$transaction(async (tx) => {
    if (borrowedCopyIdsToRelease.length > 0) {
      await tx.bookCopy.updateMany({
        where: {
          id: {
            in: borrowedCopyIdsToRelease,
          },
        },
        data: {
          status: "AVAILABLE",
        },
      });
    }

    if (affectedLoanIds.length > 0) {
      await tx.notification.deleteMany({
        where: {
          loanId: {
            in: affectedLoanIds,
          },
        },
      });

      await tx.loanHistory.deleteMany({
        where: {
          loanId: {
            in: affectedLoanIds,
          },
        },
      });
    }

    if (ownedCopyIds.length > 0) {
      await tx.loanHistory.deleteMany({
        where: {
          bookCopyId: {
            in: ownedCopyIds,
          },
        },
      });

      await tx.reservation.deleteMany({
        where: {
          bookCopyId: {
            in: ownedCopyIds,
          },
        },
      });
    }

    await tx.reservation.deleteMany({
      where: {
        userId,
      },
    });

    if (affectedLoanIds.length > 0) {
      await tx.loan.deleteMany({
        where: {
          id: {
            in: affectedLoanIds,
          },
        },
      });
    }

    if (ownedCopyIds.length > 0) {
      await tx.bookCopy.deleteMany({
        where: {
          id: {
            in: ownedCopyIds,
          },
        },
      });
    }

    for (const bookId of ownedBookIds) {
      const remainingCopies = await tx.bookCopy.count({
        where: {
          bookId,
        },
      });

      if (remainingCopies === 0) {
        await tx.book.delete({
          where: {
            id: bookId,
          },
        });
      }
    }

    await tx.notification.deleteMany({
      where: {
        userId,
      },
    });

    await tx.emailVerification.deleteMany({
      where: {
        userId,
      },
    });

    await tx.user.delete({
      where: {
        id: userId,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/notifications");
  revalidatePath("/books");
}
