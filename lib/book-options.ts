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
  "Crítica literária",
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
  "Psicologia",
  "Religião",
  "Romance",
  "Social classes",
  "Suspense",
  "Terror",
  "Outros",
] as const;

export type BookTypeOption = (typeof BOOK_TYPE_OPTIONS)[number]["value"];
export type BookGenreOption = (typeof BOOK_GENRE_OPTIONS)[number];

function normalizeComparisonValue(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function isValidBookGenre(genre: string) {
  const normalizedGenre = normalizeComparisonValue(genre);

  return BOOK_GENRE_OPTIONS.some(
    (option) => normalizeComparisonValue(option) === normalizedGenre
  );
}

export function normalizeBookGenre(genre: string) {
  const trimmedGenre = genre.trim();
  const normalizedGenre = normalizeComparisonValue(trimmedGenre);
  const matchingGenre = BOOK_GENRE_OPTIONS.find(
    (option) => normalizeComparisonValue(option) === normalizedGenre
  );

  return matchingGenre ?? trimmedGenre;
}
