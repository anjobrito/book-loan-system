import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const andre = await prisma.user.upsert({
    where: { email: "andre@email.com" },
    update: {},
    create: {
      name: "André",
      email: "andre@email.com",
      password: "123456",
      role: "ADMIN",
    },
  });

  const carlos = await prisma.user.upsert({
    where: { email: "carlos@email.com" },
    update: {},
    create: {
      name: "Carlos",
      email: "carlos@email.com",
      password: "123456",
      role: "USER",
    },
  });

  const batman = await prisma.book.upsert({
    where: { code: "COMIC-001" },
    update: {},
    create: {
      title: "Batman: Ano Um",
      type: "COMIC",
      synopsis:
        "A origem do Batman em uma das fases mais clássicas dos quadrinhos.",
      code: "COMIC-001",
      edition: "1ª edição",
      publicationYear: 1987,
      publisher: "DC Comics",
      author: "Frank Miller",
      genre: "Aventura",
    },
  });

  const iluminado = await prisma.book.upsert({
    where: { code: "BOOK-001" },
    update: {},
    create: {
      title: "O Iluminado",
      type: "BOOK",
      synopsis: "Um clássico de terror psicológico escrito por Stephen King.",
      code: "BOOK-001",
      edition: "Edição especial",
      publicationYear: 1977,
      publisher: "Doubleday",
      author: "Stephen King",
      genre: "Terror",
    },
  });

  await prisma.bookCopy.create({
    data: {
      bookId: batman.id,
      ownerId: andre.id,
      status: "AVAILABLE",
      condition: "Bom estado",
    },
  });

  await prisma.bookCopy.create({
    data: {
      bookId: iluminado.id,
      ownerId: carlos.id,
      status: "AVAILABLE",
      condition: "Usado, mas conservado",
    },
  });

  console.log("Dados iniciais criados com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });