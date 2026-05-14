"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {
  success: false,
  message: "",
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          E-mail
        </label>

        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Senha
        </label>

        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Digite sua senha"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
        />
      </div>

      {state.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="font-semibold text-amber-300 no-underline hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}
