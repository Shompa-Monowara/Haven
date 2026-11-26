import { useAuthStore } from "@/stores/auth-store";
import type { PageMeta } from "@/types/property";
import type { SessionPayload } from "@/types/auth";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ErrorBody {
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface Envelope<T> extends ErrorBody {
  data: T;
  meta?: PageMeta;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      useAuthStore.getState().clear();
      return false;
    }

    const body = (await response.json()) as { data: SessionPayload };
    useAuthStore
      .getState()
      .setSession(body.data.user, body.data.agentProfile, body.data.accessToken ?? null);
    return true;
  } catch {
    useAuthStore.getState().clear();
    return false;
  }
}

export function ensureSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function toApiError(status: number, body: ErrorBody | null): ApiClientError {
  return new ApiClientError(
    status,
    body?.error?.code ?? "REQUEST_FAILED",
    body?.error?.message ?? "Something went wrong. Please try again.",
    body?.error?.details,
  );
}

async function requestEnvelope<T>(path: string, options: ApiOptions = {}): Promise<Envelope<T>> {
  const { skipAuth = false, ...init } = options;
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const send = (token: string | null) => {
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
    return fetch(`/api${path}`, { ...init, headers: requestHeaders, credentials: "include" });
  };

  let response = await send(useAuthStore.getState().accessToken);

  if (
    response.status === 401 &&
    !skipAuth &&
    useAuthStore.getState().accessToken &&
    (await ensureSession())
  ) {
    response = await send(useAuthStore.getState().accessToken);
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !body) {
    throw toApiError(response.status, body);
  }

  return body;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const body = await requestEnvelope<T>(path, options);
  return body.data;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const send = (token: string | null) => {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`/api${path}`, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });
  };

  let response = await send(useAuthStore.getState().accessToken);

  if (response.status === 401 && useAuthStore.getState().accessToken && (await ensureSession())) {
    response = await send(useAuthStore.getState().accessToken);
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !body) {
    throw toApiError(response.status, body);
  }

  return body.data;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) => request<T>(path, { ...options, method: "GET" }),
  getPage: async <T>(path: string, options?: ApiOptions) => {
    const body = await requestEnvelope<T>(path, { ...options, method: "GET" });
    return { data: body.data, meta: body.meta as PageMeta };
  },
  post: <T>(path: string, data?: unknown, options?: ApiOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  patch: <T>(path: string, data?: unknown, options?: ApiOptions) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  delete: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
  upload,
};