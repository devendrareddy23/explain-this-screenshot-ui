import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found in index.html.");
}

const root = createRoot(rootElement);
let startupPhase = true;

function renderFatalError(message) {
  root.render(
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px", fontFamily: "sans-serif", background: "#f8fafc", color: "#111827" }}>
      <div style={{ maxWidth: "560px", width: "100%", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 12px" }}>Something went wrong</h2>
        <p style={{ margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ minHeight: "44px", padding: "0 18px", borderRadius: "999px", border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

window.addEventListener("error", (event) => {
  if (!startupPhase) {
    return;
  }

  if (event?.error?.message) {
    renderFatalError(event.error.message);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (!startupPhase) {
    return;
  }

  const reason = event?.reason;
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "A startup error prevented the app from rendering.";

  renderFatalError(message);
});

async function mountApp() {
  try {
    const module = await import("./App.jsx");
    const App = module.default;

    root.render(
      <StrictMode>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </StrictMode>
    );
    startupPhase = false;
  } catch (error) {
    console.error("Failed to mount App:", error);
    renderFatalError(error?.message || "The app failed to start.");
  }
}

mountApp();
