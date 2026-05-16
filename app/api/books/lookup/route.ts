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

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
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

  if (!volume) {
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

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
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
  const authorNames: string[] = [];

  if (Array.isArray(data.authors)) {
    for (const author of data.authors.slice(0, 4)) {
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
  }

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
      message: "Nenhum livro encontrado para este ISBN.",
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
