export class ApiClientError extends Error {
  constructor(message: string, public issues?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiClientError(body?.error ?? "Terjadi kesalahan", body?.issues);
  }

  return body as T;
}
