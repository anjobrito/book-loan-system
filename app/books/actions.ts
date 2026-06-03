"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateLoanDueDate } from "@/lib/exchange-dates";
import { processLoanReturn } from "@/lib/loan-return";
import { isValidBookGenre, normalizeBookGenre } from "@/lib/book-options";

export type CreateBookState = {
  success: boolean;
  message: string;
};

export type UpdateBookState = {
  success: boolean;
  message: string;
};

const MAX_ACTIVE_LOANS_PER_USER = 2;

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

function getControlledGenre(formData: FormData): string | null {
  const genre = normalizeBookGenre(getRequiredString(formData, "genre"));

  return isValidBookGenre(genre) ? genre : null;
}

function getCodePrefix(type: string) {
  if (type === "COMIC") {
    return "COMIC";
  }

  if (type === "MANGA") {
    return "MANGA";
  }

  return "LIV";
}

async function generateUniqueCopyCode(type: string) {
  const prefix = getCodePrefix(type);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${prefix}-${suffix}`;
    const existingCopy = await prisma.bookCopy.findUnique({
      where: {
        code,
      },
    });

    if (!existingCopy) {
      return code;
    }
  }

  return `${prefix}-${Date.now()}`;
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
    const submittedCode = getOptionalString(formData, "code");
    const code = submittedCode ?? (await generateUniqueCopyCode(type));
    const genre = getControlledGenre(formData);
    const condition = getRequiredString(formData, "condition");

    if (!genre) {
      return {
        success: false,
        message: "Selecione um gênero válido na lista.",
      };
    }

    const synopsis = getOptionalString(formData, "synopsis");
    const edition = getOptionalString(formData, "edition");
    const publisher = getOptionalString(formData, "publisher");
    const author = getOptionalString(formData, "author");
    const imageUrl = getOptionalString(formData, "imageUrl");
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
        imageUrl,
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

export async function updateBookAction(
  _previousState: UpdateBookState,
  formData: FormData
): Promise<UpdateBookState> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        message: "Você precisa estar logado para editar livros.",
      };
    }

    const bookCopyId = getRequiredString(formData, "bookCopyId");
    const bookId = getRequiredString(formData, "bookId");
    const title = getRequiredString(formData, "title");
    const type = getRequiredString(formData, "type");
    const submittedCode = getOptionalString(formData, "code");
    const genre = getControlledGenre(formData);
    const condition = getRequiredString(formData, "condition");

    if (!genre) {
      return {
        success: false,
        message: "Selecione um gênero válido na lista.",
      };
    }

    const synopsis = getOptionalString(formData, "synopsis");
    const edition = getOptionalString(formData, "edition");
    const publisher = getOptionalString(formData, "publisher");
    const author = getOptionalString(formData, "author");
    const imageUrl = getOptionalString(formData, "imageUrl");
    const publicationYear = getOptionalNumber(formData, "publicationYear");

    const copy = await prisma.bookCopy.findUnique({
      where: {
        id: bookCopyId,
      },
      include: {
        book: true,
      },
    });

    if (!copy || copy.bookId !== bookId) {
      return {
        success: false,
        message: "Exemplar não encontrado.",
      };
    }

    const canEdit = currentUser.role === "ADMIN" || copy.ownerId === currentUser.id;

    if (!canEdit) {
      return {
        success: false,
        message: "Você só pode editar livros cadastrados por você.",
      };
    }

    const code = submittedCode ?? copy.code;

    const existingCopy = await prisma.bookCopy.findFirst({
      where: {
        code,
        NOT: {
          id: bookCopyId,
        },
      },
    });

    if (existingCopy) {
      return {
        success: false,
        message: "Já existe outro exemplar cadastrado com esse código.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: {
          id: bookId,
        },
        data: {
          title,
          type,
          synopsis,
          edition,
          publicationYear,
          publisher,
          author,
          genre,
          imageUrl,
        },
      });

      await tx.bookCopy.update({
        where: {
          id: bookCopyId,
        },
        data: {
          code,
          condition,
        },
      });
    });

    revalidatePath("/books");
    revalidatePath("/admin");
    revalidatePath(`/books/${bookCopyId}/edit`);
    revalidatePath(`/books/${bookCopyId}/history`);

    return {
      success: true,
      message: "Livro atualizado com sucesso.",
    };
  } catch (error) {
    console.error("Erro ao atualizar livro:", error);

    return {
      success: false,
      message: "Erro ao atualizar livro. Verifique os campos e tente novamente.",
    };
  }
}

export async function deleteMyBookCopyAction(formData: FormData): Promise<void> {
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
      book: {
        include: {
          copies: true,
        },
      },
      loans: true,
      reservations: true,
    },
  });

  if (!copy) {
    return;
  }

  const canDelete = currentUser.role === "ADMIN" || copy.ownerId === currentUser.id;

  if (!canDelete) {
    return;
  }

  const hasActiveLoan = copy.loans.some((loan) => loan.status === "ACTIVE");
  const hasActiveReservation = copy.reservations.some(
    (reservation) => reservation.status === "ACTIVE"
  );

  if (hasActiveLoan || hasActiveReservation) {
    return;
  }

  const loanIds = copy.loans.map((loan) => loan.id);
  const isOnlyCopyForBook = copy.book.copies.length === 1;

  await prisma.$transaction(async (tx) => {
    if (loanIds.length > 0) {
      await tx.notification.deleteMany({
        where: {
          loanId: {
            in: loanIds,
          },
        },
      });
    }

    await tx.loanHistory.deleteMany({
      where: {
        bookCopyId: copy.id,
      },
    });

    await tx.reservation.deleteMany({
      where: {
        bookCopyId: copy.id,
      },
    });

    await tx.loan.deleteMany({
      where: {
        bookCopyId: copy.id,
      },
    });

    await tx.bookCopy.delete({
      where: {
        id: copy.id,
      },
    });

    if (isOnlyCopyForBook) {
      await tx.book.delete({
        where: {
          id: copy.bookId,
        },
      });
    }
  });

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/notifications");
}

export async function requestLoanAction(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return;
  }

  const activeLoansCount = await prisma.loan.count({
    where: {
      borrowerId: currentUser.id,
      status: "ACTIVE",
    },
  });

  if (activeLoansCount >= MAX_ACTIVE_LOANS_PER_USER) {
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

  if (!copy || copy.status !== "AVAILABLE" || copy.ownerId === currentUser.id) {
    return;
  }

  const dueDate = await calculateLoanDueDate();

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
        notes: `${currentUser.name} pegou "${copy.book.title}" emprestado de ${copy.owner.name}. Devolução prevista para ${dueDate.toLocaleDateString("pt-BR")}.`,
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
        )}. A data foi calculada com base nas datas de troca cadastradas pela administração. Caso precise renovar o empréstimo, solicite a renovação antes do vencimento.`,
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

export async function returnMyLoanAction(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return;
  }

  const loanId = formData.get("loanId");

  if (typeof loanId !== "string" || loanId.trim().length === 0) {
    return;
  }

  const result = await processLoanReturn({
    loanId,
    borrowerId: currentUser.id,
  });

  if (!result) {
    return;
  }

  revalidatePath("/books");
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/reservations");
  revalidatePath(`/books/${result.bookCopyId}/history`);
}

export async function cancelMyReservationAction(formData: FormData): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return;
  }

  const reservationId = formData.get("reservationId");

  if (typeof reservationId !== "string" || reservationId.trim().length === 0) {
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
          loans: {
            where: {
              status: "ACTIVE",
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

  if (reservation.status !== "ACTIVE" || reservation.userId !== currentUser.id) {
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
        notes: `${currentUser.name} cancelou a própria reserva de "${reservation.bookCopy.book.title}".`,
      },
    });

    if (activeLoan) {
      await tx.loanHistory.create({
        data: {
          loanId: activeLoan.id,
          bookCopyId: reservation.bookCopyId,
          fromUserId: currentUser.id,
          toUserId: null,
          action: "RESERVATION_CANCELLED_BY_USER",
          notes: `${currentUser.name} cancelou a própria reserva de "${reservation.bookCopy.book.title}".`,
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

  if (!copy || copy.status !== "BORROWED" || copy.ownerId === currentUser.id) {
    return;
  }

  const activeLoan = copy.loans[0];

  if (!activeLoan || activeLoan.borrowerId === currentUser.id) {
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
