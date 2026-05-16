import { NextResponse } from "next/server";

type BookLookupResult = {
  found: boolean;
  source?: "GOOGLE_BOOKS" | "OPEN_LIBRARY";
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  synopsis?: string;
  genre?: string;
  imageUrl?: string;
  message?: string;
};

type GoogleVolumeInfo = {
  title?: string;
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

  const isbn10 = convertIsbn13ToIsbn10(isbn);

  if (isbn10) {
    candidates.add(isbn10);
  }

  return Array.from(candidates);
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
    genre: Array.isArray(volume.categories) ? volume.categories[0] : undefined,
    imageUrl: normalizeHttpsImageUrl(
      volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail
    ),
  };
}

async function lookupGoogleBooksByQuery(query: string): Promise<BookLookupResult | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&country=BR&langRestrict=pt&maxResults=5`,
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
  const volume = data.items?.[0]?.volumeInfo;

  return mapGoogleVolume(volume);
}

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  const candidates = getIsbnCandidates(isbn);

  for (const candidate of candidates) {
    const byIsbn = await lookupGoogleBooksByQuery(`isbn:${candidate}`);

    if (byIsbn?.title) {
      return byIsbn;
    }
  }

  for (const candidate of candidates) {
    const byRawCode = await lookupGoogleBooksByQuery(candidate);

    if (byRawCode?.title) {
      return byRawCode;
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
    genre: Array.isArray(data.subjects) ? data.subjects[0] : undefined,
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
    genre: Array.isArray(book.subjects) ? book.subjects[0]?.name : undefined,
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
    genre: Array.isArray(doc.subject) ? doc.subject[0] : undefined,
    imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  };
}

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  const candidates = getIsbnCandidates(isbn);

  for (const candidate of candidates) {
    const result =
      (await lookupOpenLibraryIsbnEndpoint(candidate)) ??
      (await lookupOpenLibraryBooksApi(candidate)) ??
      (await lookupOpenLibrarySearch(candidate));

    if (result?.title) {
      return result;
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = sanitizeIsbn(searchParams.get("isbn") ?? "");

  if (isbn.length < 10) {
    return NextResponse.json(
      {
        found: false,
        message: "Informe um ISBN válido com 10 ou 13 dígitos.",
      },
      { status: 400 }
    );
  }

  try {
    const googleResult = await lookupGoogleBooks(isbn);

    if (googleResult?.title) {
      return NextResponse.json(googleResult);
    }

    const openLibraryResult = await lookupOpenLibrary(isbn);

    if (openLibraryResult?.title) {
      return NextResponse.json(openLibraryResult);
    }

    return NextResponse.json({
      found: false,
      message:
        "Nenhum livro encontrado para este ISBN nas bases Google Books/Open Library. Confira se o código foi digitado corretamente ou preencha manualmente.",
    });
  } catch (error) {
    console.error("Erro ao buscar livro por ISBN:", { isbn, error });

    return NextResponse.json(
      {
        found: false,
        message: "Erro ao consultar dados do livro. Tente novamente mais tarde.",
      },
      { status: 500 }
    );
  }
}
