import { useAuthStore } from "@/stores/authStore";

const BASE_URL = "/api/proxy";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && accessToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const { accessToken: newToken } = useAuthStore.getState();
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw new ApiError(
      error.message ?? `Request failed with status ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      useAuthStore.getState().clearAuth();
      return false;
    }

    const data = await response.json();
    useAuthStore.getState().setToken(data.accessToken);
    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}

export { fetchApi };
