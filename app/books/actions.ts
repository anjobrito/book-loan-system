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