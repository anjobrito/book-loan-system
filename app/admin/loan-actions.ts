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

    await tx.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        fromUserId: loan.borrowerId,
        toUserId: loan.ownerId,
        action: "RETURNED",
        notes: `${loan.borrower.name} devolveu "${loan.bookCopy.book.title}" para ${loan.owner.name}.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
}