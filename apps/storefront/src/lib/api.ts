const PRODUCTION_API_BASE =
  "https://swoosh-shop-api-l59n.onrender.com/api/v1";
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? PRODUCTION_API_BASE : "/api/v1")
).replace(/\/$/, "");

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
  };
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED",
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, headers = {}, signal } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(0, "Unable to reach the shop service.");
  }

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(
        response.status,
        "The server returned an invalid response.",
      );
    }
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? "Request failed. Please try again.",
      payload?.error?.code,
      payload?.error?.fields,
    );
  }

  return payload;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  return (await request<T>(endpoint, options)).data;
}

export async function apiFetchPage<T>(
  endpoint: string,
  options: RequestOptions = {},
) {
  const payload = await request<T[]>(endpoint, options);
  return {
    items: payload.data,
    total: payload.meta?.total ?? payload.data.length,
    totalPages: payload.meta?.totalPages ?? 1,
  };
}
