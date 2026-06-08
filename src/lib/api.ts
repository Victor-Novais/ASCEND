const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://ascend-back-end-ohtq.onrender.com";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
}

type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthCallbacks = {
  onRefreshToken: (refreshToken: string) => Promise<AuthTokens>;
  onLogout: () => Promise<void> | void;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let authTokens: AuthTokens = {
  accessToken: null,
  refreshToken: null,
};

let authCallbacks: AuthCallbacks = {
  onRefreshToken: async () => ({ accessToken: null, refreshToken: null }),
  onLogout: () => undefined,
};

let isRefreshing = false;
let refreshPromise: Promise<AuthTokens> | null = null;
let requestQueue: Array<{
  resolve: (tokens: AuthTokens) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, tokens: AuthTokens | null) {
  requestQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
      return;
    }

    entry.resolve(tokens ?? { accessToken: null, refreshToken: null });
  });
  requestQueue = [];
}

export function getAuthToken(): string | null {
  return authTokens.accessToken;
}

export function getRefreshToken(): string | null {
  return authTokens.refreshToken;
}

export function setAuthTokens(tokens: AuthTokens): void {
  authTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function clearAuthTokens(): void {
  authTokens = {
    accessToken: null,
    refreshToken: null,
  };
}

export function registerAuthCallbacks(callbacks: AuthCallbacks): void {
  authCallbacks = callbacks;
}

class ApiClient {
  constructor(private readonly baseUrl: string) { }

  private buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (!params) return url.toString();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  private async parseBody<T>(response: Response): Promise<T> {
    if (response.status === 204) return {} as T;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {} as T;

    return response.json() as Promise<T>;
  }

  private async refreshAccessToken(): Promise<AuthTokens> {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      throw new ApiError("Sessao expirada. Faca login novamente.", 401);
    }

    if (isRefreshing && refreshPromise) {
      return new Promise<AuthTokens>((resolve, reject) => {
        requestQueue.push({ resolve, reject });
      });
    }

    isRefreshing = true;
    refreshPromise = authCallbacks.onRefreshToken(currentRefreshToken);

    try {
      const refreshedTokens = await refreshPromise;
      setAuthTokens(refreshedTokens);
      processQueue(null, refreshedTokens);
      return refreshedTokens;
    } catch (error) {
      clearAuthTokens();
      processQueue(error, null);
      await authCallbacks.onLogout();
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, skipAuthRefresh, _retry, ...fetchOptions } = options;
    const headers: HeadersInit = { ...(customHeaders || {}) };

    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    const response = await fetch(this.buildUrl(endpoint, params), {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401) {
      if (skipAuthRefresh || _retry) {
        throw new ApiError("Sessao expirada. Faca login novamente.", 401);
      }

      try {
        const refreshedTokens = await this.refreshAccessToken();
        if (!refreshedTokens.accessToken) {
          throw new ApiError("Sessao expirada. Faca login novamente.", 401);
        }

        return this.request<T>(endpoint, {
          ...options,
          _retry: true,
        });
      } catch {
        throw new ApiError("Sessao expirada. Faca login novamente.", 401);
      }
    }

    if (!response.ok) {
      const payload = await this.parseBody<{ message?: string | string[] }>(response).catch(
        () => ({ message: "Erro na requisicao" }),
      );
      const message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message || `HTTP ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return this.parseBody<T>(response);
  }

  get<T>(endpoint: string, params?: RequestOptions["params"], options?: Omit<RequestOptions, "method" | "params">) {
    return this.request<T>(endpoint, { ...(options || {}), method: "GET", params });
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...(options || {}),
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...(options || {}),
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...(options || {}),
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(endpoint, { ...(options || {}), method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
