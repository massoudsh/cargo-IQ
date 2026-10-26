/// <reference types="vite/client" />

export async function requestJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`, body === undefined ? undefined : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    throw new Error(data?.error?.message ?? `خطای درخواست (${response.status})`);
  }
  return response.json();
}
