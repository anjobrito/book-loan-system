"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type CreateBookState = {
  success: boolean;
  message: string;
};

function getRequiredString(formData: FormData, field: string): string {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`O campo ${field} é obrigatório.`);
  }

  return value.trim();
}

function getOptionalString(
  formData: FormData,
  field: string
): string | undefined {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function getOptionalNumber(
  formData: FormData,
  field: string
): number | undefined {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return undefined;
  }

  return numberValue;
}

export async function createBookAction(
  _previousState: CreateBookState,
  formData: FormData
): Promise<CreateBookState> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        message: "Você precisa estar logado para cadastrar livros.",
      };
    }

    const title = getRequiredString(formData, "title");
    const type = getRequiredString(formData, "type");
    const code = getRequiredString(formData, "code");
    const genre = getRequiredString(formData, "genre");
    const condition = getRequiredString(formData, "condition");

    const synopsis = getOptionalString(formData, "synopsis");
    const edition = getOptionalString(formData, "edition");
    const publisher = getOptionalString(formData, "publisher");
    const author = getOptionalString(formData, "author");
    const publicationYear = getOptionalNumber(formData, "publicationYear");

    const existingCopy = await prisma.bookCopy.findUnique({
      where: {
        code,
      },
    });

    if (existingCopy) {
      return {
        success: false,
        message: "Já existe um exemplar cadastrado com esse código.",
      };
    }

    await prisma.book.create({
      data: {
        title,
        type,
        synopsis,
        edition,
        publicationYear,
        publisher,
        author,
        genre,
        copies: {
          create: {
            ownerId: currentUser.id,
            code,
            condition,
            status: "AVAILABLE",
          },
        },
      },
    });

    revalidatePath("/books");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Livro cadastrado com sucesso.",
    };
  } catch (error) {
    console.error("Erro ao cadastrar livro:", error);

    return {
      success: false,
      message: "Erro ao cadastrar livro. Verifique os campos e tente novamente.",
    };
  }
}

export async function requestLoanAction(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return;
  }

  const bookCopyId = formData.get("bookCopyId");

  if (typeof bookCopyId !== "string" || bookCopyId.trim().length === 0) {
    return;
  }

  const copy = await prisma.bookCopy.findUnique({
    where: {
      id: bookCopyId,
    },
    include: {
      owner: true,
      book: true,
    },
  });

  if (!copy) {
    return;
  }

  if (copy.status !== "AVAILABLE") {
    return;
  }

  if (copy.ownerId === currentUser.id) {
    return;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1);

  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({
      data: {
        bookCopyId: copy.id,
        borrowerId: currentUser.id,
        ownerId: copy.ownerId,
        dueDate,
        status: "ACTIVE",
      },
    });

    await tx.bookCopy.update({
      where: {
        id: copy.id,
      },
      data: {
        status: "BORROWED",
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: copy.id,
        fromUserId: copy.ownerId,
        toUserId: currentUser.id,
        action: "LOAN_CREATED",
        notes: `${currentUser.name} pegou "${copy.book.title}" emprestado de ${copy.owner.name}.`,
      },
    });

    await tx.notification.create({
      data: {
        loanId: loan.id,
        userId: currentUser.id,
        type: "RETURN_REMINDER",
        subject: `Lembrete de devolução: ${copy.book.title}`,
        message: `Olá ${currentUser.name}, este é um lembrete para devolver "${copy.book.title}" até ${dueDate.toLocaleDateString(
          "pt-BR"
        )}. Caso precise renovar o empréstimo, solicite a renovação antes do vencimento.`,
        scheduledFor: reminderDate,
        status: "PENDING",
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: loan.id,
        bookCopyId: copy.id,
        fromUserId: copy.ownerId,
        toUserId: currentUser.id,
        action: "REMINDER_SCHEDULED",
        notes: `Lembrete automático agendado para ${currentUser.name}.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
}

export async function createReservationAction(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return;
  }

  const bookCopyId = formData.get("bookCopyId");

  if (typeof bookCopyId !== "string" || bookCopyId.trim().length === 0) {
    return;
  }

  const copy = await prisma.bookCopy.findUnique({
    where: {
      id: bookCopyId,
    },
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
  });

  if (!copy) {
    return;
  }

  if (copy.status !== "BORROWED") {
    return;
  }

  if (copy.ownerId === currentUser.id) {
    return;
  }

  const activeLoan = copy.loans[0];

  if (!activeLoan) {
    return;
  }

  if (activeLoan.borrowerId === currentUser.id) {
    return;
  }

  const existingActiveReservation = await prisma.reservation.findFirst({
    where: {
      bookCopyId: copy.id,
      userId: currentUser.id,
      status: "ACTIVE",
    },
  });

  if (existingActiveReservation) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.create({
      data: {
        bookCopyId: copy.id,
        userId: currentUser.id,
        status: "ACTIVE",
        notes: `${currentUser.name} entrou na fila de reserva para "${copy.book.title}".`,
      },
    });

    await tx.loanHistory.create({
      data: {
        loanId: activeLoan.id,
        bookCopyId: copy.id,
        fromUserId: activeLoan.borrowerId,
        toUserId: currentUser.id,
        action: "RESERVATION_CREATED",
        notes: `${currentUser.name} reservou "${copy.book.title}". Enquanto essa reserva estiver ativa, o empréstimo não poderá ser renovado.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${copy.id}/history`);
}