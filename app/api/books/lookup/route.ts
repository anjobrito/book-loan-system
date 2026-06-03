import { NextResponse } from "next/server";
import { isValidBookGenre, normalizeBookGenre } from "@/lib/book-options";

type BookLookupSource =
  | "GOOGLE_BOOKS"
  | "OPEN_LIBRARY"
  | "WIKIPEDIA"
  | "WEB_SEARCH";

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
    type?: string;
    identifier?: string;
  }>;
};

type GoogleCustomSearchItem = {
  title?: string;
  snippet?: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
    book?: Array<Record<string, string>>;
    product?: Array<Record<string, string>>;
  };
};

type WikipediaSummary = {
  title?: string;
  extract?: string;
  thumbnail?: {
    source?: string;
  };
};

class ProviderQuotaError extends Error {
  constructor(provider: string) {
    super(`${provider} quota exceeded`);
    this.name = "ProviderQuotaError";
  }
}

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

  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
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

function getGoogleQueriesForIsbn(isbn: string) {
  const queries = new Set<string>();

  getIsbnCandidates(isbn).forEach((candidate) => {
    queries.add(`isbn:${candidate}`);
    queries.add(candidate);
    queries.add(`ISBN ${candidate}`);
    queries.add(`"${candidate}"`);
    queries.add(`${candidate} livro`);
    queries.add(`${candidate} book`);
  });

  return Array.from(queries);
}

async function safeLookupStep(
  label: string,
  lookup: () => Promise<BookLookupResult | null>
) {
  try {
    return await lookup();
  } catch (error) {
    if (error instanceof ProviderQuotaError) {
      throw error;
    }

    console.error(`Erro na etapa de busca de livro: ${label}`, error);
    return null;
  }
}

function mergeLookupResults(
  base: BookLookupResult | null,
  enrichment: BookLookupResult | null
): BookLookupResult | null {
  if (!base) {
    return enrichment;
  }

  if (!enrichment) {
    return base;
  }

  return {
    ...base,
    title: base.title ?? enrichment.title,
    author: base.author ?? enrichment.author,
    publisher: base.publisher ?? enrichment.publisher,
    publicationYear: base.publicationYear ?? enrichment.publicationYear,
    synopsis: base.synopsis ?? enrichment.synopsis,
    genre: base.genre ?? enrichment.genre,
    edition: base.edition ?? enrichment.edition,
    imageUrl: base.imageUrl ?? enrichment.imageUrl,
  };
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
  options?: { isbn?: string }
): Promise<BookLookupResult | null> {
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
    console.error("Google Books retornou erro:", response.status, errorText);

    if (response.status === 429 || errorText.includes("quota_limit_value")) {
      throw new ProviderQuotaError("Google Books");
    }

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
    try {
      const result = await safeLookupStep(`Google Books: ${query}`, () =>
        lookupGoogleBooksByQuery(query, {
          isbn,
        })
      );

      if (result?.title) {
        return result;
      }
    } catch (error) {
      if (error instanceof ProviderQuotaError) {
        console.warn(
          "Google Books ignorado nesta busca porque a quota diária do projeto está zerada ou esgotada."
        );
        return null;
      }

      throw error;
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
      (await safeLookupStep(`Open Library ISBN endpoint: ${candidate}`, () =>
        lookupOpenLibraryIsbnEndpoint(candidate)
      )) ??
      (await safeLookupStep(`Open Library Books API: ${candidate}`, () =>
        lookupOpenLibraryBooksApi(candidate)
      )) ??
      (await safeLookupStep(`Open Library ISBN search: ${candidate}`, () =>
        lookupOpenLibrarySearch(candidate)
      )) ??
      (await safeLookupStep(`Open Library text search ISBN ${candidate}`, () =>
        lookupOpenLibraryGeneralSearch(`ISBN ${candidate}`)
      )) ??
      (await safeLookupStep(`Open Library text search livro ${candidate}`, () =>
        lookupOpenLibraryGeneralSearch(`${candidate} livro`)
      ));

    if (result?.title) {
      return result;
    }
  }

  return null;
}

function cleanupWebSearchTitle(value?: string) {
  if (!value) {
    return undefined;
  }

  const cleanedTitle = value
    .replace(/\s*[-|–—:].*$/g, "")
    .replace(/^Livro\s+/i, "")
    .replace(/^Comprar\s+/i, "")
    .replace(/^ISBN\s+/i, "")
    .replace(/[“”"]/g, "")
    .trim();

  return cleanedTitle.length >= 3 ? cleanedTitle : undefined;
}

function mapWebSearchItemToLookup(item: GoogleCustomSearchItem): BookLookupResult | null {
  const metatag = item.pagemap?.metatags?.[0] ?? {};
  const book = item.pagemap?.book?.[0] ?? {};
  const product = item.pagemap?.product?.[0] ?? {};
  const title =
    cleanupWebSearchTitle(book.name) ??
    cleanupWebSearchTitle(product.name) ??
    cleanupWebSearchTitle(metatag["og:title"]) ??
    cleanupWebSearchTitle(item.title);

  if (!title) {
    return null;
  }

  return {
    found: true,
    source: "WEB_SEARCH",
    title,
    author: book.author,
    publisher: book.publisher,
    synopsis: metatag["og:description"] ?? item.snippet,
    imageUrl: normalizeHttpsImageUrl(metatag["og:image"]),
  };
}

async function lookupWebSearch(query: string): Promise<BookLookupResult | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.warn(
      "Busca web de livros ignorada: GOOGLE_SEARCH_API_KEY ou GOOGLE_SEARCH_ENGINE_ID não configurado."
    );
    return null;
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "5");
  url.searchParams.set("hl", "pt-BR");
  url.searchParams.set("gl", "br");

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    console.error("Google Custom Search retornou erro:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  for (const item of items) {
    const result = mapWebSearchItemToLookup(item);

    if (result?.title) {
      return result;
    }
  }

  return null;
}

async function lookupWikipediaSummary(title?: string): Promise<BookLookupResult | null> {
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

      return {
        found: true,
        source: "WIKIPEDIA",
        title: data.title,
        synopsis: data.extract,
        genre: "Outros",
        imageUrl: normalizeHttpsImageUrl(data.thumbnail?.source),
      };
    });

    if (result?.title) {
      return result;
    }
  }

  return null;
}

async function enrichWithWikipedia(result: BookLookupResult | null) {
  if (!result?.title || result.synopsis) {
    return result;
  }

  const wikipediaResult = await lookupWikipediaSummary(result.title);

  return mergeLookupResults(result, wikipediaResult);
}

async function lookupByTitleOrAuthor(query: string): Promise<BookLookupResult | null> {
  const googleResult = await safeLookupStep(`Google Books query: ${query}`, () =>
    lookupGoogleBooksByQuery(query)
  );

  if (googleResult?.title) {
    return enrichWithWikipedia(googleResult);
  }

  const openLibraryResult = await safeLookupStep(`Open Library query: ${query}`, () =>
    lookupOpenLibraryGeneralSearch(query)
  );

  if (openLibraryResult?.title) {
    return enrichWithWikipedia(openLibraryResult);
  }

  const wikipediaResult = await lookupWikipediaSummary(query);

  if (wikipediaResult?.title) {
    return wikipediaResult;
  }

  return null;
}

async function lookupByIsbn(isbn: string) {
  const googleResult = await safeLookupStep(`Google Books ISBN flow: ${isbn}`, () =>
    lookupGoogleBooks(isbn)
  );

  if (googleResult?.title) {
    return enrichWithWikipedia(googleResult);
  }

  const openLibraryResult = await safeLookupStep(`Open Library ISBN flow: ${isbn}`, () =>
    lookupOpenLibrary(isbn)
  );

  if (openLibraryResult?.title) {
    return enrichWithWikipedia(openLibraryResult);
  }

  const webResult =
    (await safeLookupStep(`Web Search ISBN livro: ${isbn}`, () =>
      lookupWebSearch(`ISBN ${isbn} livro`)
    )) ??
    (await safeLookupStep(`Web Search ISBN formatado: ${isbn}`, () =>
      lookupWebSearch(`ISBN ${formatIsbn13(isbn)} livro`)
    )) ??
    (await safeLookupStep(`Web Search ISBN exato: ${isbn}`, () =>
      lookupWebSearch(`"${isbn}" livro`)
    ));

  if (webResult?.title) {
    const enrichedByTitle = await lookupByTitleOrAuthor(webResult.title);
    return enrichWithWikipedia(mergeLookupResults(webResult, enrichedByTitle));
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
      return NextResponse.json(isbnResult);
    }
  }

  if (query.length >= 3) {
    const queryResult = await safeLookupStep(`Fluxo completo por título/autor: ${query}`, () =>
      lookupByTitleOrAuthor(query)
    );

    if (queryResult?.title) {
      return NextResponse.json(queryResult);
    }
  }

  return NextResponse.json({
    found: false,
    message:
      "Nenhum livro encontrado nas bases disponíveis. Confira o ISBN ou tente buscar por título e autor.",
  });
}
