import { NextResponse } from "next/server";
import { isValidBookGenre, normalizeBookGenre } from "@/lib/book-options";

type BookLookupSource = "GOOGLE_BOOKS" | "OPEN_LIBRARY" | "WIKIPEDIA";

type BookLookupResult = {
  found: boolean;
  source?: BookLookupSource;
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  synopsis?: string;
  genre?: string;
  edition?: string;
  imageUrl?: string;
  message?: string;
};

type GoogleVolumeInfo = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  industryIdentifiers?: Array<{
    identifier?: string;
  }>;
};

type WikipediaSummary = {
  title?: string;
  extract?: string;
  thumbnail?: {
    source?: string;
  };
};

function isProviderEnabled(name: string, defaultValue: boolean) {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLocaleLowerCase("pt-BR") === "true";
}

function sanitizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTextForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function formatIsbn13(isbn: string) {
  if (!/^\d{13}$/.test(isbn)) {
    return isbn;
  }

  return `${isbn.slice(0, 3)}-${isbn.slice(3, 5)}-${isbn.slice(5, 8)}-${isbn.slice(8, 12)}-${isbn.slice(12)}`;
}

function getYear(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function normalizeHttpsImageUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
}

function normalizeLookupGenre(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalizedGenre = normalizeBookGenre(value);
  return isValidBookGenre(normalizedGenre) ? normalizedGenre : undefined;
}

function inferGenreFromText(...values: Array<string | undefined | null>) {
  const text = normalizeTextForMatch(values.filter(Boolean).join(" "));

  if (!text) {
    return undefined;
  }

  if (
    text.includes("romance policial") ||
    text.includes("policial") ||
    text.includes("detective") ||
    text.includes("detetive") ||
    text.includes("crime") ||
    text.includes("murder") ||
    text.includes("assassinato") ||
    text.includes("hercule poirot")
  ) {
    return "Policial";
  }

  if (text.includes("misterio") || text.includes("mystery")) {
    return "Mistério";
  }

  if (text.includes("suspense") || text.includes("thriller")) {
    return "Suspense";
  }

  if (text.includes("terror") || text.includes("horror")) {
    return "Terror";
  }

  if (text.includes("ficcao cientifica") || text.includes("science fiction") || text.includes("sci-fi")) {
    return "Ficção Científica";
  }

  if (text.includes("fantasia") || text.includes("fantasy")) {
    return "Fantasia";
  }

  if (text.includes("biografia") || text.includes("biography")) {
    return "Biografia";
  }

  if (text.includes("auto ajuda") || text.includes("self-help") || text.includes("self help")) {
    return "Auto Ajuda";
  }

  if (text.includes("gestao") || text.includes("management")) {
    return "Gestão";
  }

  if (text.includes("lideranca") || text.includes("leadership")) {
    return "Liderança";
  }

  if (text.includes("psicologia") || text.includes("psychology")) {
    return "Psicologia";
  }

  if (text.includes("programacao") || text.includes("programming")) {
    return "Programação";
  }

  if (text.includes("religiao") || text.includes("religion")) {
    return "Religião";
  }

  if (text.includes("poesia") || text.includes("poetry")) {
    return "Poesia";
  }

  if (text.includes("historia") || text.includes("history")) {
    return "História";
  }

  if (text.includes("romance") || text.includes("novel") || text.includes("literatura") || text.includes("literature")) {
    return "Romance";
  }

  return undefined;
}

function resolveLookupGenre(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const normalizedGenre = normalizeLookupGenre(value ?? undefined);

    if (normalizedGenre) {
      return normalizedGenre;
    }
  }

  return inferGenreFromText(...values) ?? "Outros";
}

function getGoogleEdition(volume: GoogleVolumeInfo) {
  if (!volume.subtitle) {
    return undefined;
  }

  const lowerSubtitle = volume.subtitle.toLocaleLowerCase("pt-BR");

  if (
    lowerSubtitle.includes("edição") ||
    lowerSubtitle.includes("edicao") ||
    lowerSubtitle.includes("edition") ||
    lowerSubtitle.includes("volume") ||
    lowerSubtitle.includes("vol.")
  ) {
    return volume.subtitle;
  }

  return undefined;
}

function convertIsbn13ToIsbn10(isbn: string) {
  if (!/^978\d{10}$/.test(isbn)) {
    return undefined;
  }

  const core = isbn.slice(3, 12);
  const total = core
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const checkValue = (11 - (total % 11)) % 11;
  const checkDigit = checkValue === 10 ? "X" : String(checkValue);

  return `${core}${checkDigit}`;
}

function getIsbnCandidates(isbn: string) {
  const candidates = new Set<string>();

  candidates.add(isbn);
  candidates.add(formatIsbn13(isbn));

  const isbn10 = convertIsbn13ToIsbn10(isbn);

  if (isbn10) {
    candidates.add(isbn10);
  }

  return Array.from(candidates).filter(Boolean);
}

function finalizeLookupResult(result: BookLookupResult | null): BookLookupResult | null {
  if (!result) {
    return null;
  }

  return {
    ...result,
    genre:
      result.genre && result.genre !== "Outros"
        ? result.genre
        : resolveLookupGenre(result.genre, result.title, result.synopsis, result.author),
  };
}

function mergeLookupResults(
  base: BookLookupResult | null,
  enrichment: BookLookupResult | null
): BookLookupResult | null {
  if (!base) {
    return finalizeLookupResult(enrichment);
  }

  if (!enrichment) {
    return finalizeLookupResult(base);
  }

  return finalizeLookupResult({
    ...base,
    title: base.title ?? enrichment.title,
    author: base.author ?? enrichment.author,
    publisher: base.publisher ?? enrichment.publisher,
    publicationYear: base.publicationYear ?? enrichment.publicationYear,
    synopsis: base.synopsis ?? enrichment.synopsis,
    genre:
      base.genre && base.genre !== "Outros"
        ? base.genre
        : enrichment.genre && enrichment.genre !== "Outros"
          ? enrichment.genre
          : inferGenreFromText(base.title, enrichment.title, base.synopsis, enrichment.synopsis),
    edition: base.edition ?? enrichment.edition,
    imageUrl: base.imageUrl ?? enrichment.imageUrl,
  });
}

async function safeLookupStep(
  label: string,
  lookup: () => Promise<BookLookupResult | null>
) {
  try {
    return finalizeLookupResult(await lookup());
  } catch (error) {
    console.error(`Erro na etapa de busca de livro: ${label}`, error);
    return null;
  }
}

function mapGoogleVolume(volume?: GoogleVolumeInfo): BookLookupResult | null {
  if (!volume?.title) {
    return null;
  }

  const category = Array.isArray(volume.categories) ? volume.categories[0] : undefined;

  return finalizeLookupResult({
    found: true,
    source: "GOOGLE_BOOKS",
    title: volume.title,
    author: Array.isArray(volume.authors) ? volume.authors.join(", ") : undefined,
    publisher: volume.publisher,
    publicationYear: getYear(volume.publishedDate),
    synopsis: volume.description,
    genre: resolveLookupGenre(category, volume.title, volume.description),
    edition: getGoogleEdition(volume),
    imageUrl: normalizeHttpsImageUrl(
      volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail
    ),
  });
}

function scoreGoogleVolume(volume: GoogleVolumeInfo, isbn?: string) {
  let score = 0;

  if (volume.title) score += 10;
  if (Array.isArray(volume.authors) && volume.authors.length > 0) score += 4;
  if (volume.publisher) score += 3;
  if (volume.description) score += 3;
  if (Array.isArray(volume.categories) && volume.categories.length > 0) score += 2;
  if (volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail) score += 2;

  if (isbn && Array.isArray(volume.industryIdentifiers)) {
    const identifiers = volume.industryIdentifiers.map((identifier) =>
      sanitizeIsbn(identifier.identifier ?? "")
    );

    if (identifiers.includes(isbn)) {
      score += 30;
    }
  }

  return score;
}

async function lookupGoogleBooksByQuery(query: string, isbn?: string) {
  if (!isProviderEnabled("ENABLE_GOOGLE_BOOKS_LOOKUP", false)) {
    return null;
  }

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("country", "BR");
  url.searchParams.set("maxResults", "10");

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 429 || errorText.includes("quota_limit_value")) {
      console.warn(
        "Google Books ignorado nesta busca porque a quota diária do projeto está zerada ou esgotada."
      );
      return null;
    }

    console.error("Google Books retornou erro:", response.status, errorText);
    return null;
  }

  const data = await response.json();
  const volumes = Array.isArray(data.items)
    ? data.items
        .map((item: { volumeInfo?: GoogleVolumeInfo }) => item.volumeInfo)
        .filter(Boolean)
    : [];

  const bestVolume = volumes.sort(
    (first: GoogleVolumeInfo, second: GoogleVolumeInfo) =>
      scoreGoogleVolume(second, isbn) - scoreGoogleVolume(first, isbn)
  )[0];

  return mapGoogleVolume(bestVolume);
}

async function lookupGoogleBooksByIsbn(isbn: string) {
  const queries = new Set<string>();

  getIsbnCandidates(isbn).forEach((candidate) => {
    queries.add(`isbn:${candidate}`);
    queries.add(candidate);
    queries.add(`ISBN ${candidate}`);
    queries.add(`${candidate} livro`);
  });

  for (const query of queries) {
    const result = await lookupGoogleBooksByQuery(query, isbn);

    if (result?.title) {
      return result;
    }
  }

  return null;
}

async function fetchOpenLibraryAuthorNames(authorKeys?: Array<{ key?: string }>) {
  const authorNames: string[] = [];

  if (!Array.isArray(authorKeys)) {
    return authorNames;
  }

  for (const author of authorKeys.slice(0, 4)) {
    if (!author?.key) {
      continue;
    }

    try {
      const response = await fetch(`https://openlibrary.org${author.key}.json`, {
        next: {
          revalidate: 60 * 60 * 24,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.name) {
          authorNames.push(data.name);
        }
      }
    } catch {
      // Author lookup is optional.
    }
  }

  return authorNames;
}

async function lookupOpenLibraryIsbnEndpoint(isbn: string) {
  const response = await fetch(
    `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data.title) {
    return null;
  }

  const authorNames = await fetchOpenLibraryAuthorNames(data.authors);
  const subject = Array.isArray(data.subjects) ? data.subjects[0] : undefined;
  const synopsis =
    typeof data.description === "string"
      ? data.description
      : data.description?.value;

  return finalizeLookupResult({
    found: true,
    source: "OPEN_LIBRARY",
    title: data.title,
    author: authorNames.length > 0 ? authorNames.join(", ") : undefined,
    publisher: Array.isArray(data.publishers) ? data.publishers[0] : undefined,
    publicationYear: getYear(data.publish_date),
    synopsis,
    genre: resolveLookupGenre(subject, data.title, synopsis),
    edition: Array.isArray(data.edition_name) ? data.edition_name[0] : data.edition_name,
    imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  });
}

async function lookupOpenLibraryBooksApi(isbn: string) {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
      isbn
    )}&jscmd=data&format=json`,
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const book = data[`ISBN:${isbn}`];

  if (!book?.title) {
    return null;
  }

  const subject = Array.isArray(book.subjects) ? book.subjects[0]?.name : undefined;
  const synopsis = book.excerpts?.[0]?.text;

  return finalizeLookupResult({
    found: true,
    source: "OPEN_LIBRARY",
    title: book.title,
    author: Array.isArray(book.authors)
      ? book.authors.map((author: { name?: string }) => author.name).filter(Boolean).join(", ")
      : undefined,
    publisher: Array.isArray(book.publishers) ? book.publishers[0]?.name : undefined,
    publicationYear: getYear(book.publish_date),
    synopsis,
    genre: resolveLookupGenre(subject, book.title, synopsis),
    imageUrl: normalizeHttpsImageUrl(book.cover?.large ?? book.cover?.medium ?? book.cover?.small),
  });
}

async function lookupOpenLibrarySearchByIsbn(isbn: string) {
  const response = await fetch(
    `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`,
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const doc = data.docs?.[0];

  if (!doc?.title) {
    return null;
  }

  const subject = Array.isArray(doc.subject) ? doc.subject[0] : undefined;

  return finalizeLookupResult({
    found: true,
    source: "OPEN_LIBRARY",
    title: doc.title,
    author: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : undefined,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    publicationYear: doc.first_publish_year,
    genre: resolveLookupGenre(subject, doc.title),
    imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  });
}

async function lookupOpenLibraryByQuery(query: string) {
  if (!isProviderEnabled("ENABLE_OPEN_LIBRARY_LOOKUP", true)) {
    return null;
  }

  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`,
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const doc = data.docs?.[0];

  if (!doc?.title) {
    return null;
  }

  const subject = Array.isArray(doc.subject) ? doc.subject[0] : undefined;

  return finalizeLookupResult({
    found: true,
    source: "OPEN_LIBRARY",
    title: doc.title,
    author: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : undefined,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    publicationYear: doc.first_publish_year,
    genre: resolveLookupGenre(subject, doc.title, query),
    imageUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
  });
}

async function lookupOpenLibraryByIsbn(isbn: string) {
  if (!isProviderEnabled("ENABLE_OPEN_LIBRARY_LOOKUP", true)) {
    return null;
  }

  for (const candidate of getIsbnCandidates(isbn)) {
    const result =
      (await safeLookupStep(`Open Library ISBN endpoint: ${candidate}`, () =>
        lookupOpenLibraryIsbnEndpoint(candidate)
      )) ??
      (await safeLookupStep(`Open Library Books API: ${candidate}`, () =>
        lookupOpenLibraryBooksApi(candidate)
      )) ??
      (await safeLookupStep(`Open Library ISBN search: ${candidate}`, () =>
        lookupOpenLibrarySearchByIsbn(candidate)
      )) ??
      (await safeLookupStep(`Open Library query ISBN ${candidate}`, () =>
        lookupOpenLibraryByQuery(`ISBN ${candidate}`)
      ));

    if (result?.title) {
      return finalizeLookupResult(result);
    }
  }

  return null;
}

async function lookupWikipediaSummary(title?: string) {
  if (!isProviderEnabled("ENABLE_WIKIPEDIA_LOOKUP", true)) {
    return null;
  }

  if (!title || title.trim().length < 3) {
    return null;
  }

  const languages = ["pt", "en", "es", "fr"];

  for (const language of languages) {
    const result = await safeLookupStep(`Wikipedia ${language}: ${title}`, async () => {
      const response = await fetch(
        `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          next: {
            revalidate: 60 * 60 * 24,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as WikipediaSummary;

      if (!data.title || !data.extract) {
        return null;
      }

      return finalizeLookupResult({
        found: true,
        source: "WIKIPEDIA",
        title: data.title,
        synopsis: data.extract,
        genre: resolveLookupGenre(data.title, data.extract),
        imageUrl: normalizeHttpsImageUrl(data.thumbnail?.source),
      });
    });

    if (result?.title) {
      return finalizeLookupResult(result);
    }
  }

  return null;
}

async function enrichWithWikipedia(result: BookLookupResult | null) {
  if (!result?.title || result.synopsis) {
    return finalizeLookupResult(result);
  }

  const wikipediaResult = await lookupWikipediaSummary(result.title);

  return mergeLookupResults(result, wikipediaResult);
}

async function lookupByIsbn(isbn: string) {
  const openLibraryResult = await safeLookupStep(`Open Library ISBN flow: ${isbn}`, () =>
    lookupOpenLibraryByIsbn(isbn)
  );

  if (openLibraryResult?.title) {
    return enrichWithWikipedia(openLibraryResult);
  }

  const googleResult = await safeLookupStep(`Google Books ISBN flow: ${isbn}`, () =>
    lookupGoogleBooksByIsbn(isbn)
  );

  if (googleResult?.title) {
    return enrichWithWikipedia(googleResult);
  }

  return null;
}

async function lookupByTitleOrAuthor(query: string) {
  const wikipediaResult = await safeLookupStep(`Wikipedia query: ${query}`, () =>
    lookupWikipediaSummary(query)
  );

  if (wikipediaResult?.title) {
    return finalizeLookupResult(wikipediaResult);
  }

  const openLibraryResult = await safeLookupStep(`Open Library query: ${query}`, () =>
    lookupOpenLibraryByQuery(query)
  );

  if (openLibraryResult?.title) {
    return enrichWithWikipedia(openLibraryResult);
  }

  const googleResult = await safeLookupStep(`Google Books query: ${query}`, () =>
    lookupGoogleBooksByQuery(query)
  );

  if (googleResult?.title) {
    return enrichWithWikipedia(googleResult);
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = sanitizeIsbn(searchParams.get("isbn") ?? "");
  const query = sanitizeSearchTerm(searchParams.get("q") ?? "");

  if (isbn.length < 10 && query.length < 3) {
    return NextResponse.json(
      {
        found: false,
        message: "Informe um ISBN válido ou uma busca por título/autor com pelo menos 3 caracteres.",
      },
      { status: 400 }
    );
  }

  if (isbn.length >= 10) {
    const isbnResult = await safeLookupStep(`Fluxo completo por ISBN: ${isbn}`, () =>
      lookupByIsbn(isbn)
    );

    if (isbnResult?.title) {
      return NextResponse.json(finalizeLookupResult(isbnResult));
    }
  }

  if (query.length >= 3) {
    const queryResult = await safeLookupStep(`Fluxo completo por título/autor: ${query}`, () =>
      lookupByTitleOrAuthor(query)
    );

    if (queryResult?.title) {
      return NextResponse.json(finalizeLookupResult(queryResult));
    }
  }

  return NextResponse.json({
    found: false,
    message:
      isbn.length >= 10
        ? "Não encontrei esse ISBN nas bases disponíveis. Tente buscar pelo título e autor para preencher os dados automaticamente."
        : "Nenhum livro encontrado nas bases disponíveis. Tente informar título e autor juntos.",
  });
}
