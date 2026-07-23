const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/$/, "");

interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId?: string;
}

interface ApiFailure {
  success: false;
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
  };
  requestId?: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  retryAfterRefresh?: boolean;
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
let refreshRequest: Promise<AdminSession> | null = null;

export interface AdminSession {
  accessToken: string;
  permissions: string[];
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<ApiSuccess<T> | ApiFailure | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError(response.status, "The server returned an invalid response");
  }
}

async function rawRequest<T>(
  endpoint: string,
  { method = "GET", body, headers = {}, retryAfterRefresh = true }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseResponse<T>(response);

  if (
    response.status === 401 &&
    retryAfterRefresh &&
    !endpoint.startsWith("/admin/auth/")
  ) {
    try {
      await refreshAdminSession();
      return rawRequest<T>(endpoint, { method, body, headers, retryAfterRefresh: false });
    } catch {
      setAccessToken(null);
    }
  }

  if (!response.ok || !payload || !("success" in payload) || !payload.success) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(
      response.status,
      failure?.error?.message ?? "Request failed. Please try again.",
      failure?.error?.code,
      failure?.error?.fields,
    );
  }

  return payload.data;
}

export function adminApiFetch<T>(
  endpoint: string,
  options: Omit<RequestOptions, "retryAfterRefresh"> = {},
) {
  return rawRequest<T>(endpoint, options);
}

export async function loginAdmin(email: string, password: string) {
  const session = await rawRequest<AdminSession>("/admin/auth/login", {
    method: "POST",
    body: { email, password },
    retryAfterRefresh: false,
  });
  setAccessToken(session.accessToken);
  return session;
}

export function refreshAdminSession(): Promise<AdminSession> {
  if (!refreshRequest) {
    refreshRequest = rawRequest<AdminSession>("/admin/auth/refresh", {
      method: "POST",
      retryAfterRefresh: false,
    })
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function logoutAdmin() {
  try {
    await rawRequest<{ success: boolean }>("/admin/auth/logout", {
      method: "POST",
      retryAfterRefresh: false,
    });
  } finally {
    setAccessToken(null);
  }
}
