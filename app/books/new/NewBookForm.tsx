"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createBookAction, type CreateBookState } from "../actions";

const initialState: CreateBookState = {
  success: false,
  message: "",
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
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
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
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        placeholder={placeholder}
      />
    </div>
  );
}

export default function NewBookForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createBookAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/books");
      router.refresh();
    }
  }, [state.success, router]);

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

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Título"
          name="title"
          required
          placeholder="Ex: Batman: Ano Um"
        />

        <div>
          <label htmlFor="type" className="mb-2 block text-sm font-medium text-slate-200">
            Tipo <span className="text-amber-300">*</span>
          </label>

          <select
            id="type"
            name="type"
            required
            defaultValue="BOOK"
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
          placeholder="Ex: BOOK-002"
        />

        <FormField
          label="Gênero"
          name="genre"
          required
          placeholder="Ex: Terror, Romance, Aventura"
        />

        <FormField
          label="Autor"
          name="author"
          placeholder="Ex: Stephen King"
        />

        <FormField
          label="Editora"
          name="publisher"
          placeholder="Ex: DC Comics"
        />

        <FormField
          label="Edição"
          name="edition"
          placeholder="Ex: 1ª edição"
        />

        <FormField
          label="Ano de publicação"
          name="publicationYear"
          type="number"
          placeholder="Ex: 1987"
        />

        <div className="md:col-span-2">
          <FormField
            label="Estado do exemplar"
            name="condition"
            required
            placeholder="Ex: Bom estado, novo, usado, com marcas"
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
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            placeholder="Escreva uma breve sinopse da obra"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/books")}
          className="w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
        >
          Cancelar
        </button>

        <SubmitButton />
      </div>
    </form>
  );
}