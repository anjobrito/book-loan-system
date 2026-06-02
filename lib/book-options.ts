export const BOOK_TYPE_OPTIONS = [
  { value: "BOOK", label: "Livro" },
  { value: "COMIC", label: "Comic" },
  { value: "MANGA", label: "Mangá" },
] as const;

export const BOOK_GENRE_OPTIONS = [
  "Aventura",
  "Auto Ajuda",
  "Biografia",
  "Ciência",
  "Comédia",
  "Drama",
  "Educação",
  "Fantasia",
  "Ficção Científica",
  "História",
  "Infantil",
  "Mangá",
  "Mistério",
  "Negócios",
  "Poesia",
  "Policial",
  "Programação",
  "Religião",
  "Romance",
  "Suspense",
  "Terror",
  "Outros",
] as const;

export type BookTypeOption = (typeof BOOK_TYPE_OPTIONS)[number]["value"];
export type BookGenreOption = (typeof BOOK_GENRE_OPTIONS)[number];

export function isValidBookGenre(genre: string) {
  return BOOK_GENRE_OPTIONS.includes(genre as BookGenreOption);
}

export function normalizeBookGenre(genre: string) {
  const trimmedGenre = genre.trim();
  const normalizedGenre = BOOK_GENRE_OPTIONS.find(
    (option) => option.toLocaleLowerCase("pt-BR") === trimmedGenre.toLocaleLowerCase("pt-BR")
  );

  return normalizedGenre ?? trimmedGenre;
}
