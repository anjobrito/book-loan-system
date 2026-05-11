"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

    const owner = await prisma.user.findUnique({
      where: {
        email: "andre@email.com",
      },
    });

    if (!owner) {
      return {
        success: false,
        message:
          "Dono padrão não encontrado. Rode npm run seed antes de cadastrar livros.",
      };
    }

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
            ownerId: owner.id,
            code,
            condition,
            status: "AVAILABLE",
          },
        },
      },
    });

    revalidatePath("/books");

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

  const borrowerEmail =
    copy.owner.email === "andre@email.com"
      ? "carlos@email.com"
      : "andre@email.com";

  const borrower = await prisma.user.findUnique({
    where: {
      email: borrowerEmail,
    },
  });

  if (!borrower) {
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
        borrowerId: borrower.id,
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
        toUserId: borrower.id,
        action: "LOAN_CREATED",
        notes: `${borrower.name} pegou "${copy.book.title}" emprestado de ${copy.owner.name}.`,
      },
    });

    await tx.notification.create({
      data: {
        loanId: loan.id,
        userId: borrower.id,
        type: "RETURN_REMINDER",
        subject: `Lembrete de devolução: ${copy.book.title}`,
        message: `Olá ${borrower.name}, este é um lembrete para devolver "${copy.book.title}" até ${dueDate.toLocaleDateString(
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
        toUserId: borrower.id,
        action: "REMINDER_SCHEDULED",
        notes: `Lembrete automático agendado para ${borrower.name}.`,
      },
    });
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
}