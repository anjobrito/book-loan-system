"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createBookAction, type CreateBookState } from "../actions";

const initialState: CreateBookState = {
  success: false,
  message: "",
};

type BookLookupResult = {
  found: boolean;
  source?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  synopsis?: string;
  genre?: string;
  imageUrl?: string;
  message?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
    >
      {pending ? "Cadastrando..." : "Cadastrar exemplar"}
    </button>
  );
}

function FormField({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
  helpText,
  value,
  onChange,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
  helpText?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label} {required && <span className="text-amber-300">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        placeholder={placeholder}
      />

      {helpText && <p className="mt-2 text-xs leading-5 text-slate-400">{helpText}</p>}
    </div>
  );
}

export default function NewBookForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createBookAction, initialState);
  const [isbn, setIsbn] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("BOOK");
  const [genre, setGenre] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [edition, setEdition] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [condition, setCondition] = useState("");
  const [synopsis, setSynopsis] = useState("");

  useEffect(() => {
    if (state.success) {
      router.push("/books");
      router.refresh();
    }
  }, [state.success, router]);

  function applyLookupData(data: BookLookupResult) {
    if (data.title) setTitle(data.title);
    if (data.author) setAuthor(data.author);
    if (data.publisher) setPublisher(data.publisher);
    if (data.publicationYear) setPublicationYear(String(data.publicationYear));
    if (data.synopsis) setSynopsis(data.synopsis);
    if (data.genre) setGenre(data.genre);
    if (data.imageUrl) setImageUrl(data.imageUrl);

    setLookupMessage(
      `Dados encontrados em ${data.source === "OPEN_LIBRARY" ? "Open Library" : "Google Books"}. Revise antes de cadastrar.`
    );
  }

  async function lookupBookByIsbn() {
    const cleanIsbn = isbn.replace(/[^0-9Xx]/g, "");

    if (cleanIsbn.length < 10) {
      setLookupMessage("Informe um ISBN válido. Ele normalmente tem 10 ou 13 dígitos.");
      return;
    }

    setIsLookupLoading(true);
    setLookupMessage("Buscando dados do livro...");

    try {
      const response = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(cleanIsbn)}`);
      const data = (await response.json()) as BookLookupResult;

      if (!response.ok || !data.found) {
        setLookupMessage(
          `${data.message ?? "Nenhum livro encontrado para este ISBN."} Tente a busca por título/autor abaixo.`
        );
        return;
      }

      applyLookupData(data);
    } catch {
      setLookupMessage("Erro ao buscar dados do livro. Tente novamente.");
    } finally {
      setIsLookupLoading(false);
    }
  }

  async function lookupBookByTitleOrAuthor() {
    const query = manualQuery.trim();

    if (query.length < 3) {
      setLookupMessage("Informe pelo menos 3 caracteres para buscar por título ou autor.");
      return;
    }

    setIsLookupLoading(true);
    setLookupMessage("Buscando dados por título/autor...");

    try {
      const response = await fetch(`/api/books/lookup?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as BookLookupResult;

      if (!response.ok || !data.found) {
        setLookupMessage(data.message ?? "Nenhum resultado encontrado para essa busca.");
        return;
      }

      applyLookupData(data);
    } catch {
      setLookupMessage("Erro ao buscar dados do livro. Tente novamente.");
    } finally {
      setIsLookupLoading(false);
    }
  }

  return (
    <form action={formAction} className="mx-auto max-w-4xl space-y-6">
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
        <strong className="text-amber-300">Cadastro rápido:</strong>{" "}
        livros, mangás e muitos comics possuem ISBN perto do código de barras ou
        nas primeiras páginas. Se o ISBN não for encontrado, use a busca por
        título/autor como plano B. Algumas edições, comics avulsos ou materiais
        antigos podem não aparecer nas bases públicas.
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <label htmlFor="isbnLookup" className="mb-2 block text-sm font-medium text-slate-200">
          ISBN para busca automática
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            id="isbnLookup"
            type="text"
            value={isbn}
            onChange={(event) => setIsbn(event.target.value)}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            placeholder="Ex: 9788532530783"
          />
          <button
            type="button"
            disabled={isLookupLoading}
            onClick={lookupBookByIsbn}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isLookupLoading ? "Buscando..." : "Buscar por ISBN"}
          </button>
        </div>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <label htmlFor="manualLookup" className="mb-2 block text-sm font-medium text-slate-200">
            Busca alternativa por título ou autor
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              id="manualLookup"
              type="text"
              value={manualQuery}
              onChange={(event) => setManualQuery(event.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder="Ex: Agatha Christie Assassinato no Expresso do Oriente"
            />
            <button
              type="button"
              disabled={isLookupLoading}
              onClick={lookupBookByTitleOrAuthor}
              className="rounded-xl border border-red-500 px-5 py-3 font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              {isLookupLoading ? "Buscando..." : "Buscar por título/autor"}
            </button>
          </div>
        </div>

        {lookupMessage && (
          <p className="mt-3 text-sm text-slate-300">{lookupMessage}</p>
        )}
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        <strong className="text-amber-300">Sobre o código do exemplar:</strong>{" "}
        esse código identifica fisicamente o livro na troca. Use algo simples,
        como LIV-001, MANGA-003 ou COMIC-010, e coloque o mesmo código em uma
        etiqueta ou anotação no livro.
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Título"
          name="title"
          required
          placeholder="Ex: Batman: Ano Um"
          value={title}
          onChange={setTitle}
        />

        <div>
          <label
            htmlFor="type"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Tipo <span className="text-amber-300">*</span>
          </label>

          <select
            id="type"
            name="type"
            required
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="BOOK">Livro</option>
            <option value="COMIC">Comic</option>
            <option value="MANGA">Mangá</option>
          </select>
        </div>

        <FormField
          label="Código do exemplar"
          name="code"
          required
          placeholder="Ex: LIV-001"
          helpText="Pegue esse código do próprio livro ou crie um novo código e marque no exemplar físico. Ele ajuda a identificar o livro correto no dia da troca."
        />

        <FormField
          label="Gênero"
          name="genre"
          required
          placeholder="Ex: Terror, Romance, Aventura"
          value={genre}
          onChange={setGenre}
        />

        <FormField
          label="Autor"
          name="author"
          placeholder="Ex: Stephen King"
          value={author}
          onChange={setAuthor}
        />

        <FormField
          label="Editora"
          name="publisher"
          placeholder="Ex: DC Comics"
          value={publisher}
          onChange={setPublisher}
        />

        <FormField
          label="Edição"
          name="edition"
          placeholder="Ex: 1ª edição"
          value={edition}
          onChange={setEdition}
        />

        <FormField
          label="Ano de publicação"
          name="publicationYear"
          type="number"
          placeholder="Ex: 1987"
          value={publicationYear}
          onChange={setPublicationYear}
        />

        <div className="md:col-span-2">
          <FormField
            label="URL da capa"
            name="imageUrl"
            type="url"
            placeholder="Ex: https://exemplo.com/capa.jpg"
            value={imageUrl}
            onChange={setImageUrl}
          />
        </div>

        <div className="md:col-span-2">
          <FormField
            label="Estado do exemplar"
            name="condition"
            required
            placeholder="Ex: Bom estado, novo, usado, com marcas"
            value={condition}
            onChange={setCondition}
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="synopsis"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Sinopse
          </label>

          <textarea
            id="synopsis"
            name="synopsis"
            rows={5}
            value={synopsis}
            onChange={(event) => setSynopsis(event.target.value)}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            placeholder="Escreva uma breve sinopse da obra"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Deseja cancelar o cadastro deste livro?")) {
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
