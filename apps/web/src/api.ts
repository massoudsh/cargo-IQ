/// <reference types="vite/client" />

export const errorMessages = {
  fa: {
    network: "ارتباط با سرویس برقرار نشد؛ اتصال را بررسی و دوباره تلاش کنید.",
    permission: "دسترسی به این اطلاعات مجاز نیست؛ وضعیت دسترسی را با مدیر سامانه بررسی کنید.",
    validation: "اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید.",
    rate: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
    server: "سرویس موقتاً پاسخ‌گو نیست؛ دوباره تلاش کنید.",
  },
  en: {
    network: "Cannot reach the service. Check your connection and retry.",
    permission: "Access denied. Check your access with the administrator.",
    validation: "Invalid input. Review the fields and retry.",
    rate: "Too many requests. Wait before retrying.",
    server: "The service is temporarily unavailable. Please retry.",
  },
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; }
}

export async function requestJson<T>(path: string, body?: unknown): Promise<T> {
  const messages = errorMessages[document.documentElement.lang.startsWith("en") ? "en" : "fa"];
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`, body === undefined ? undefined : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch { throw new ApiError(messages.network, 0); }
  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    const fallback = response.status === 401 || response.status === 403 ? messages.permission
      : response.status === 429 ? messages.rate : response.status >= 500 ? messages.server : messages.validation;
    const message = response.status >= 500 || response.status === 401 || response.status === 403 || response.status === 429
      ? fallback : typeof data?.error?.message === "string" ? data.error.message : fallback;
    throw new ApiError(message, response.status);
  }
  return response.json();
}
