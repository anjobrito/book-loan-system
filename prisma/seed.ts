import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findOrCreateBook(data: {
  title: string;
  type: string;
  synopsis?: string;
  edition?: string;
  publicationYear?: number;
  publisher?: string;
  author?: string;
  genre: string;
}) {
  const existingBook = await prisma.book.findFirst({
    where: {
      title: data.title,
      author: data.author,
      edition: data.edition,
    },
  });

  if (existingBook) {
    return existingBook;
  }

  return prisma.book.create({
    data,
  });
}

async function main() {
  const andre = await prisma.user.upsert({
    where: { email: "andre@email.com" },
    update: {
      name: "André",
      role: "ADMIN",
    },
    create: {
      name: "André",
      email: "andre@email.com",
      password: "123456",
      role: "ADMIN",
    },
  });

  const carlos = await prisma.user.upsert({
    where: { email: "carlos@email.com" },
    update: {
      name: "Carlos",
      role: "USER",
    },
    create: {
      name: "Carlos",
      email: "carlos@email.com",
      password: "123456",
      role: "USER",
    },
  });

  const batman = await findOrCreateBook({
    title: "Batman: Ano Um",
    type: "COMIC",
    synopsis:
      "A origem do Batman em uma das fases mais clássicas dos quadrinhos.",
    edition: "1ª edição",
    publicationYear: 1987,
    publisher: "DC Comics",
    author: "Frank Miller",
    genre: "Aventura",
  });

  const iluminado = await findOrCreateBook({
    title: "O Iluminado",
    type: "BOOK",
    synopsis: "Um clássico de terror psicológico escrito por Stephen King.",
    edition: "Edição especial",
    publicationYear: 1977,
    publisher: "Doubleday",
    author: "Stephen King",
    genre: "Terror",
  });

  await prisma.bookCopy.upsert({
    where: {
      code: "COMIC-001",
    },
    update: {
      bookId: batman.id,
      ownerId: andre.id,
      status: "AVAILABLE",
      condition: "Bom estado",
    },
    create: {
      bookId: batman.id,
      ownerId: andre.id,
      code: "COMIC-001",
      status: "AVAILABLE",
      condition: "Bom estado",
    },
  });

  await prisma.bookCopy.upsert({
    where: {
      code: "BOOK-001",
    },
    update: {
      bookId: iluminado.id,
      ownerId: carlos.id,
      status: "AVAILABLE",
      condition: "Usado, mas conservado",
    },
    create: {
      bookId: iluminado.id,
      ownerId: carlos.id,
      code: "BOOK-001",
      status: "AVAILABLE",
      condition: "Usado, mas conservado",
    },
  });

  console.log("Dados iniciais criados com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });