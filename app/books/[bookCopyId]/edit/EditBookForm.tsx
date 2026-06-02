"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { BOOK_GENRE_OPTIONS, BOOK_TYPE_OPTIONS } from "@/lib/book-options";
import { updateBookAction, type UpdateBookState } from "../../actions";

const initialState: UpdateBookState = {
  success: false,
  message: "",
};

type EditBookFormProps = {
  copy: {
    id: string;
    code: string;
    condition: string | null;
    bookId: string;
    book: {
      title: string;
      type: string;
      synopsis: string | null;
      edition: string | null;
      publicationYear: number | null;
      publisher: string | null;
      author: string | null;
      genre: string;
      imageUrl: string | null;
    };
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

function FormField({
  label,
  name,
  placeholder,
  defaultValue,
  required = false,
  type = "text",
  helpText,
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  helpText?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-slate-200">
        {label} {required && <span className="text-amber-300">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        placeholder={placeholder}
      />

      {helpText && <p className="mt-2 text-xs leading-5 text-slate-400">{helpText}</p>}
    </div>
  );
}

export default function EditBookForm({ copy }: EditBookFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateBookAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/books");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="mx-auto max-w-4xl space-y-6">
      <input type="hidden" name="bookCopyId" value={copy.id} />
      <input type="hidden" name="bookId" value={copy.bookId} />

      {state.message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            state.success
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        Edite as informações do livro e do exemplar físico. O código do exemplar
        deve continuar igual ao código marcado no livro.
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Título"
          name="title"
          required
          placeholder="Ex: Batman: Ano Um"
          defaultValue={copy.book.title}
        />

        <div>
          <label htmlFor="type" className="mb-2 block text-sm font-medium text-slate-200">
            Tipo <span className="text-amber-300">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={copy.book.type}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          >
            {BOOK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <FormField
          label="Código do exemplar"
          name="code"
          required
          placeholder="Ex: LIV-001"
          defaultValue={copy.code}
          helpText="Esse código precisa bater com a etiqueta ou anotação feita no exemplar físico."
        />

        <div>
          <label htmlFor="genre" className="mb-2 block text-sm font-medium text-slate-200">
            Gênero <span className="text-amber-300">*</span>
          </label>
          <select
            id="genre"
            name="genre"
            required
            defaultValue={copy.book.genre}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="" disabled>
              Selecione um gênero
            </option>
            {BOOK_GENRE_OPTIONS.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          {!BOOK_GENRE_OPTIONS.includes(copy.book.genre as (typeof BOOK_GENRE_OPTIONS)[number]) && (
            <p className="mt-2 text-xs leading-5 text-amber-300">
              O gênero atual deste registro é "{copy.book.genre}" e precisa ser normalizado para uma das opções acima antes de salvar.
            </p>
          )}
        </div>

        <FormField
          label="Autor"
          name="author"
          placeholder="Ex: Stephen King"
          defaultValue={copy.book.author}
        />

        <FormField
          label="Editora"
          name="publisher"
          placeholder="Ex: DC Comics"
          defaultValue={copy.book.publisher}
        />

        <FormField
          label="Edição"
          name="edition"
          placeholder="Ex: 1ª edição"
          defaultValue={copy.book.edition}
        />

        <FormField
          label="Ano de publicação"
          name="publicationYear"
          type="number"
          placeholder="Ex: 1987"
          defaultValue={copy.book.publicationYear}
        />

        <div className="md:col-span-2">
          <FormField
            label="URL da capa"
            name="imageUrl"
            type="url"
            placeholder="Ex: https://exemplo.com/capa.jpg"
            defaultValue={copy.book.imageUrl}
          />
        </div>

        <div className="md:col-span-2">
          <FormField
            label="Estado do exemplar"
            name="condition"
            required
            placeholder="Ex: Bom estado, novo, usado, com marcas"
            defaultValue={copy.condition}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="synopsis" className="mb-2 block text-sm font-medium text-slate-200">
            Sinopse
          </label>
          <textarea
            id="synopsis"
            name="synopsis"
            rows={5}
            defaultValue={copy.book.synopsis ?? ""}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            placeholder="Escreva uma breve sinopse da obra"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Deseja cancelar a edição deste livro?")) {
              router.push("/books");
            }
          }}
          className="w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
        >
          Cancelar
        </button>

        <SubmitButton />
      </div>
    </form>
  );
}
