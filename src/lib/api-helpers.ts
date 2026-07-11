import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUserId } from "@/lib/current-user";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** UangKu runs without login — resolves the single implicit user account. */
export async function requireUserId(): Promise<string> {
  return getCurrentUserId();
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten() },
      { status: 400 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
