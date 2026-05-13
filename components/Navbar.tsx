import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Navbar() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-bottom border-secondary bg-dark">
      <nav className="navbar navbar-dark">
        <div className="container d-flex align-items-center justify-content-between">
          <Link
            href="/"
            className="navbar-brand mb-0 fw-bold text-warning text-decoration-none"
          >
            Book Loan System
          </Link>

          <div className="d-flex align-items-center gap-3">
            <Link
              href="/"
              className="text-light text-decoration-none fw-semibold"
            >
              Início
            </Link>

            <Link
              href="/books"
              className="text-light text-decoration-none fw-semibold"
            >
              Catálogo
            </Link>

            <Link
              href="/books/new"
              className="btn btn-warning btn-sm fw-bold text-dark"
            >
              Cadastrar livro
            </Link>

            <Link
              href="/admin/loans"
              className="text-light text-decoration-none fw-semibold"
            >
              Empréstimos
            </Link>

            <Link
              href="/admin/reservations"
              className="text-light text-decoration-none fw-semibold"
            >
              Reservas
            </Link>

            <Link
              href="/admin/notifications"
              className="text-light text-decoration-none fw-semibold"
            >
              Notificações
            </Link>

            <Link
              href="/admin"
              className="btn btn-outline-light btn-sm fw-bold"
            >
              Admin
            </Link>

            {currentUser ? (
              <>
                <span className="text-light small">
                  {currentUser.name} ({currentUser.role})
                </span>

                <Link
                  href="/logout"
                  className="btn btn-outline-warning btn-sm fw-bold"
                >
                  Sair
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn btn-warning btn-sm fw-bold">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}