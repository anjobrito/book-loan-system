import { NextResponse } from "next/server";
import { normalizeBookGenre, isValidBookGenre } from "@/lib/book-options";

type BookLookupResult = {
  found: boolean;
  source?: "GOOGLE_BOOKS" | "OPEN_LIBRARY";
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
    type?: string;
    identifier?: string;
  }>;
};

function sanitizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
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

  if (value.startsWith("http://")) {
    return value.replace("http://", "https://");
  }

  return value;
}

function normalizeLookupGenre(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalizedGenre = normalizeBookGenre(value);
  return isValidBookGenre(normalizedGenre) ? normalizedGenre : "Outros";
}

function getGoogleEdition(volume: GoogleVolumeInfo) {
  if (!volume.subtitle) {
    return undefined;
  }

  const lowerSubtitle = volume.subtitle.toLocaleLowerCase("pt-BR");
  const looksLikeEdition =
    lowerSubtitle.includes("edição") ||
    lowerSubtitle.includes("edicao") ||
    lowerSubtitle.includes("edition") ||
    lowerSubtitle.includes("volume") ||
    lowerSubtitle.includes("vol.");

  return looksLikeEdition ? volume.subtitle : undefined;
}

function convertIsbn13ToIsbn10(isbn: string) {
  if (!/^978\d{10}$/.test(isbn)) {
    return undefined;
  }

  const core = isbn.slice(3, 12);
  const total = core
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const remainder = total % 11;
  const checkValue = (11 - remainder) % 11;
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

function getGoogleQueriesForIsbn(isbn: string) {
  const candidates = getIsbnCandidates(isbn);
  const queries = new Set<string>();

  candidates.forEach((candidate) => {
    queries.add(`isbn:${candidate}`);
    queries.add(candidate);
    queries.add(`ISBN ${candidate}`);
    queries.add(`"${candidate}"`);
    queries.add(`${candidate} livro`);
    queries.add(`${candidate} book`);
  });

  return Array.from(queries);
}

function mapGoogleVolume(volume: GoogleVolumeInfo): BookLookupResult | null {
  if (!volume?.title) {
    return null;
  }

  return {
    found: true,
    source: "GOOGLE_BOOKS",
    title: volume.title,
    author: Array.isArray(volume.authors) ? volume.authors.join(", ") : undefined,
    publisher: volume.publisher,
    publicationYear: getYear(volume.publishedDate),
    synopsis: volume.description,
    genre: normalizeLookupGenre(Array.isArray(volume.categories) ? volume.categories[0] : undefined),
    edition: getGoogleEdition(volume),
    imageUrl: normalizeHttpsImageUrl(
      volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail
    ),
  };
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

async function lookupGoogleBooksByQuery(
  query: string,
  options?: { isbn?: string; langRestrict?: string }
): Promise<BookLookupResult | null> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("country", "BR");
  url.searchParams.set("maxResults", "10");

  if (options?.langRestrict) {
    url.searchParams.set("langRestrict", options.langRestrict);
  }

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
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
      scoreGoogleVolume(second, options?.isbn) - scoreGoogleVolume(first, options?.isbn)
  )[0];

  return mapGoogleVolume(bestVolume);
}

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  const queries = getGoogleQueriesForIsbn(isbn);

  for (const query of queries) {
    const result = await lookupGoogleBooksByQuery(query, {
      isbn,
      langRestrict: "pt",
    });

    if (result?.title) {
      return result;
    }
  }

  for (const query of queries) {
    const result = await lookupGoogleBooksByQuery(query, {
      isbn,
    });

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
      const authorResponse = await fetch(`https://openlibrary.org${author.key}.json`, {
        next: {
          revalidate: 60 * 60 * 24,
        },
      });

      if (authorResponse.ok) {
        const authorData = await authorResponse.json();
        if (authorData.name) {
          authorNames.push(authorData.name);
        }
      }
    } catch {
      // Author lookup is helpful, but the book lookup can still work without it.
    }
  }

  return authorNames;
}

async function lookupOpenLibraryIsbnEndpoint(isbn: string): Promise<BookLookupResult | null> {
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

  return {
    found: true,
    source: "OPEN_LIBRARY",
    title: data.title,
    author: authorNames.length > 0 ? authorNames.join(", ") : undefined,
    publisher: Array.isArray(data.publishers) ? data.publishers[0] : undefined,
    publicationYear: getYear(data.publish_date),
    synopsis:
      typeof data.description === "string"
        ? data.description
        : data.description?.value,
    genre: normalizeLookupGenre(Array.isArray(data.subjects) ? data.subjects[0] : undefined),
    edition: Array.isArray(data.edition_name) ? data.edition_name[0] : data.edition_name,
    imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  };
}

async function lookupOpenLibraryBooksApi(isbn: string): Promise<BookLookupResult | null> {
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

  return {
    found: true,
    source: "OPEN_LIBRARY",
    title: book.title,
    author: Array.isArray(book.authors)
      ? book.authors.map((author: { name?: string }) => author.name).filter(Boolean).join(", ")
      : undefined,
    publisher: Array.isArray(book.publishers) ? book.publishers[0]?.name : undefined,
    publicationYear: getYear(book.publish_date),
    synopsis: book.excerpts?.[0]?.text,
    genre: normalizeLookupGenre(Array.isArray(book.subjects) ? book.subjects[0]?.name : undefined),
    edition: Array.isArray(book.identifiers?.edition) ? book.identifiers.edition[0] : undefined,
    imageUrl: normalizeHttpsImageUrl(book.cover?.large ?? book.cover?.medium ?? book.cover?.small),
  };
}

async function lookupOpenLibrarySearch(isbn: string): Promise<BookLookupResult | null> {
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

  return {
    found: true,
    source: "OPEN_LIBRARY",
    title: doc.title,
    author: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : undefined,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    publicationYear: doc.first_publish_year,
    genre: normalizeLookupGenre(Array.isArray(doc.subject) ? doc.subject[0] : undefined),
    edition: Array.isArray(doc.edition_key) ? doc.edition_key[0] : undefined,
    imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  };
}

async function lookupOpenLibraryGeneralSearch(query: string): Promise<BookLookupResult | null> {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3&language=por`,
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

  return {
    found: true,
    source: "OPEN_LIBRARY",
    title: doc.title,
    author: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : undefined,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    publicationYear: doc.first_publish_year,
    genre: normalizeLookupGenre(Array.isArray(doc.subject) ? doc.subject[0] : undefined),
    edition: Array.isArray(doc.edition_key) ? doc.edition_key[0] : undefined,
    imageUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
  };
}

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  const candidates = getIsbnCandidates(isbn);

  for (const candidate of candidates) {
    const result =
      (await lookupOpenLibraryIsbnEndpoint(candidate)) ??
      (await lookupOpenLibraryBooksApi(candidate)) ??
      (await lookupOpenLibrarySearch(candidate)) ??
      (await lookupOpenLibraryGeneralSearch(`ISBN ${candidate}`)) ??
      (await lookupOpenLibraryGeneralSearch(`${candidate} livro`));

    if (result?.title) {
      return result;
    }
  }

  return null;
}

async function lookupByTitleOrAuthor(query: string): Promise<BookLookupResult | null> {
  const googleResult =
    (await lookupGoogleBooksByQuery(query, { langRestrict: "pt" })) ??
    (await lookupGoogleBooksByQuery(query));

  if (googleResult?.title) {
    return googleResult;
  }

  return lookupOpenLibraryGeneralSearch(query);
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

  try {
    if (isbn.length >= 10) {
      const googleResult = await lookupGoogleBooks(isbn);

      if (googleResult?.title) {
        return NextResponse.json(googleResult);
      }

      const openLibraryResult = await lookupOpenLibrary(isbn);

      if (openLibraryResult?.title) {
        return NextResponse.json(openLibraryResult);
      }
    }

    if (query.length >= 3) {
      const queryResult = await lookupByTitleOrAuthor(query);

      if (queryResult?.title) {
        return NextResponse.json(queryResult);
      }
    }

    return NextResponse.json({
      found: false,
      message:
        "Nenhum livro encontrado nas bases Google Books/Open Library. Confira o ISBN ou tente buscar por título e autor.",
    });
  } catch (error) {
    console.error("Erro ao buscar livro:", { isbn, query, error });

    return NextResponse.json(
      {
        found: false,
        message: "Erro ao consultar dados do livro. Tente novamente mais tarde.",
      },
      { status: 500 }
    );
  }
}
