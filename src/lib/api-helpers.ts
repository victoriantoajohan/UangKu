import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Resolves the current session's user id, or throws a 401 ApiError. */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }
  return session.user.id;
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
