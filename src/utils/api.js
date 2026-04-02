import API_BASE from "../config";

let authTokenCleared = false;
let unauthorizedHandled = false;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_METHODS = new Set(["GET"]);

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function dispatchApiError(message, status = 0) {
  window.dispatchEvent(
    new CustomEvent("hireflow:api-error", {
      detail: {
        message,
        status,
      },
    })
  );
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access failures so the app can still render.
  }
}

function safeSessionStorageClear() {
  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage access failures so the app can still render.
  }
}

function notifyUnauthorized() {
  if (unauthorizedHandled) {
    return;
  }

  unauthorizedHandled = true;
  clearTokenMemory();
  safeLocalStorageRemove("token");
  safeLocalStorageRemove("user");
  safeSessionStorageClear();
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new CustomEvent("hireflow:unauthorized"));
}

export function getToken() {
  const storedToken = safeLocalStorageGet("token");

  if (storedToken) {
    return storedToken;
  }

  if (authTokenCleared) {
    return "";
  }

  return import.meta.env.VITE_DEV_TOKEN || "";
}

export function clearTokenMemory() {
  authTokenCleared = true;
}

export function resetUnauthorizedState() {
  unauthorizedHandled = false;
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const shouldRetry = options.retry !== false && RETRYABLE_METHODS.has(method);
  const retryCount = shouldRetry ? Number(options.retryCount ?? DEFAULT_RETRY_COUNT) : 1;
  const timeoutMs = Math.max(1000, Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const token = getToken();
  let lastError = null;

  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        headers,
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        const invalidJsonError = new Error("Server returned invalid JSON.");
        invalidJsonError.status = response.status || 500;
        throw invalidJsonError;
      }

      if (!response.ok) {
        if (response.status === 401) {
          notifyUnauthorized();
        }

        const error = new Error(data?.message || "Request failed.");
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("This request took too long. Please try again.");
        timeoutError.status = 408;
        lastError = timeoutError;
      } else if (error?.status === 429) {
        const rateLimitError = new Error("HireFlow is busy right now. Please try again in a moment.");
        rateLimitError.status = 429;
        lastError = rateLimitError;
      } else if (!error?.status) {
        const networkError = new Error("We couldn't reach HireFlow right now. Check your connection and try again.");
        networkError.status = 0;
        lastError = networkError;
      } else if (error?.status >= 500) {
        const serverError = new Error("HireFlow hit a temporary issue. Please try again.");
        serverError.status = error.status;
        lastError = serverError;
      } else {
        lastError = error;
      }

      const isUnauthorized = error?.status === 401;
      const canRetry = shouldRetry && !isUnauthorized && attempt < retryCount - 1;

      if (canRetry) {
        await delay(1000 * (attempt + 1));
        continue;
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (lastError?.status !== 401 && options.suppressGlobalError !== true) {
    dispatchApiError(lastError?.message || "Request failed.", lastError?.status || 0);
  }

  throw lastError || new Error("Request failed.");
}
