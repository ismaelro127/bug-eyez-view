const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/$/, "");

let sessionRedirectInProgress = false;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("authToken")
  );
}

function clearClientAuth(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("token");
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("user");

  // This can only clear a non-httpOnly cookie. The backend remains
  // responsible for clearing any httpOnly session cookie.
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
    const contentType = copy.headers.get("content-type") || "";

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
    window.location.assign("/login?reason=session-expired");
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getStoredToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const bodyIsFormData =
    typeof FormData !== "undefined" &&
    init.body instanceof FormData;

  if (
    init.body != null &&
    !bodyIsFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  if (
    !shouldSkipSessionRedirect(path) &&
    (await responseLooksLikeSessionFailure(response))
  ) {
    redirectToLoginOnce();
  }

  return response;
}
