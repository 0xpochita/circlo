import { useAuthStore } from "@/stores/authStore";

const BASE_URL = "/api/proxy";
const DEFAULT_TIMEOUT_MS = 15_000;

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type FetchApiOptions = RequestInit & {
  timeout?: number;
};

async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...requestInit } = options;
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((requestInit.headers as Record<string, string>) ?? {}),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const externalSignal = requestInit.signal;

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else {
    externalSignal?.addEventListener("abort", () => {
      controller.abort(externalSignal.reason);
    });
  }

  const timeoutId = setTimeout(
    () => controller.abort("Request timeout"),
    timeout,
  );

  try {
    let response = await fetch(`${BASE_URL}${path}`, {
      ...requestInit,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 && accessToken) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        const { accessToken: newToken } = useAuthStore.getState();
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(`${BASE_URL}${path}`, {
          ...requestInit,
          headers,
          signal: controller.signal,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: "An unexpected error occurred",
      }));
      throw new ApiError(
        error.message ?? `Request failed with status ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled or timed out", 0);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();

  try {
    const body: Record<string, string> = {};
    if (refreshToken) {
      body.refreshToken = refreshToken;
    }

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().clearAuth();
      }
      return false;
    }

    const data = await response.json();
    if (data.accessToken) {
      useAuthStore.getState().setToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export { fetchApi };
