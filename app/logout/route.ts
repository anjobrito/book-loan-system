import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}