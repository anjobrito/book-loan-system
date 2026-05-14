import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Navbar() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <header className="sticky-top border-bottom border-secondary bg-dark shadow-sm">
      <nav className="navbar navbar-dark">
        <div className="container d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 py-2">
          <Link
            href="/"
            className="navbar-brand mb-0 fw-bold text-warning text-decoration-none"
          >
            Biblioteca Comunitária
          </Link>

          <div className="d-flex flex-wrap align-items-center gap-2 gap-lg-3">
            <Link
              href="/"
              className="text-light text-decoration-none fw-semibold small"
            >
              Início
            </Link>

            <Link
              href="/books"
              className="text-light text-decoration-none fw-semibold small"
            >
              Catálogo
            </Link>

            {currentUser && (
              <Link
                href="/books/new"
                className="btn btn-warning btn-sm fw-bold text-dark"
              >
                Cadastrar livro
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  href="/admin/users"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Usuários
                </Link>

                <Link
                  href="/admin/exchange-dates"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Datas de troca
                </Link>

                <Link
                  href="/admin/loans"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Empréstimos
                </Link>

                <Link
                  href="/admin/reservations"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Reservas
                </Link>

                <Link
                  href="/admin/notifications"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Notificações
                </Link>

                <Link
                  href="/admin"
                  className="btn btn-outline-light btn-sm fw-bold"
                >
                  Admin
                </Link>
              </>
            )}

            {currentUser ? (
              <>
                <span className="text-light small">
                  {currentUser.name} ({currentUser.role})
                </span>

                <a
                  href="/logout"
                  className="btn btn-outline-warning btn-sm fw-bold"
                >
                  Sair
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="text-light text-decoration-none fw-semibold small"
                >
                  Criar conta
                </Link>

                <Link href="/login" className="btn btn-warning btn-sm fw-bold">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
