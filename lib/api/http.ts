import type { NextResponse } from "next/server";
import { NextResponse as NR } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NR.json(data, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NR.json({ ok: false, error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return NR.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN_STAFF") {
      return NR.json({ ok: false, error: "Accès réservé au staff" }, { status: 403 });
    }
  }

  console.error(error);
  return NR.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
}

export type JsonResult = NextResponse;
