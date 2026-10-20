const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/$/, "");

let sessionRedirectInProgress = false;
let refreshPromise: Promise<string | null> | null = null;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("authToken")
  );
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem("refreshToken");
}

function storeTokens(
  accessToken: string,
  refreshToken?: string | null
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem("token", accessToken);

  if (refreshToken) {
    window.localStorage.setItem(
      "refreshToken",
      refreshToken
    );
  }

  document.cookie = `token=${accessToken}; path=/;`;
}

function clearClientAuth(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("token");
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("refreshToken");
  window.localStorage.removeItem("user");

  document.cookie =
    "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function responseLooksLikeSessionFailure(
  response: Response
): Promise<boolean> {
  if (response.status === 401) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  try {
    const copy = response.clone();
    const contentType =
      copy.headers.get("content-type") || "";

    let text = "";

    if (contentType.includes("application/json")) {
      const data = await copy.json().catch(() => null);
      text = JSON.stringify(data || "");
    } else {
      text = await copy.text().catch(() => "");
    }

    return /(?:session|token|jwt|auth|login|expired|unauthori[sz]ed|no_auth|not accepted)/i.test(
      text
    );
  } catch {
    return false;
  }
}

function shouldSkipSessionRedirect(path: string): boolean {
  return /\/api\/auth\/(?:login|register|logout|refresh)(?:\/|$|\?)/i.test(
    path
  );
}

function redirectToLoginOnce(): void {
  if (typeof window === "undefined") return;
  if (sessionRedirectInProgress) return;

  sessionRedirectInProgress = true;
  clearClientAuth();

  window.dispatchEvent(
    new CustomEvent("bugz:session-expired")
  );

  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign(
      "/login?reason=session-expired"
    );
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(
        buildUrl("/api/auth/refresh"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response
        .json()
        .catch(() => null);

      const accessToken =
        data?.accessToken || data?.token;

      if (!accessToken) {
        return null;
      }

      storeTokens(
        accessToken,
        data?.refreshToken || refreshToken
      );

      return accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function performRequest(
  path: string,
  init: RequestInit,
  token: string | null
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const bodyIsFormData =
    typeof FormData !== "undefined" &&
    init.body instanceof FormData;

  if (
    init.body != null &&
    !bodyIsFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (!headers.has("Accept")) {
    headers.set(
      "Accept",
      "application/json"
    );
  }

  return fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let response = await performRequest(
    path,
    init,
    getStoredToken()
  );

  if (shouldSkipSessionRedirect(path)) {
    return response;
  }

  if (
    !(await responseLooksLikeSessionFailure(response))
  ) {
    return response;
  }

  const newAccessToken =
    await refreshAccessToken();

  if (newAccessToken) {
    response = await performRequest(
      path,
      init,
      newAccessToken
    );

    if (
      !(await responseLooksLikeSessionFailure(response))
    ) {
      return response;
    }
  }

  redirectToLoginOnce();

  return response;
}