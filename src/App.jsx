import { useEffect, useMemo, useState } from "react";
import "./App.css";
import JobsTab from "./components/JobsTab";
import { apiRequest, getApiBaseUrl } from "./utils/api";

const TABS = [
  { key: "fix-errors", label: "Fix Errors" },
  { key: "resume-tailor", label: "Resume Tailor" },
  { key: "cover-letter", label: "Cover Letter" },
  { key: "jobs", label: "Jobs" },
];

function PlaceholderTab({ title, text }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("jobs");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  async function fetchMe(currentToken) {
    try {
      const data = await apiRequest("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (data?.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error.message);
    }
  }

  useEffect(() => {
    if (token && !user) {
      fetchMe(token);
    }
  }, [token]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const isLogin = authMode === "login";
      const path = isLogin ? "/api/auth/login" : "/api/auth/register";

      const payload = isLogin
        ? {
            email: form.email,
            password: form.password,
          }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
          };

      const data = await apiRequest(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const nextToken = data?.token || "";
      const nextUser = data?.user || null;

      if (!nextToken) {
        throw new Error("Token missing in auth response.");
      }

      setToken(nextToken);
      setUser(nextUser);
      setAuthMessage(isLogin ? "Login successful." : "Account created successfully.");
      setForm({
        name: "",
        email: "",
        password: "",
      });
      setActiveTab("jobs");
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setAuthError("");
    setAuthMessage("");
    setActiveTab("jobs");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  const isLoggedIn = Boolean(token);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <h1>HireFlow AI</h1>
          <p className="muted">API Base: {apiBaseUrl}</p>
        </div>

        {isLoggedIn ? (
          <div className="user-box">
            <div>
              <div><strong>Email:</strong> {user?.email || "Unknown"}</div>
              <div><strong>Plan:</strong> {user?.plan || "free"}</div>
              <div><strong>Status:</strong> {user?.subscriptionStatus || "inactive"}</div>
            </div>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : null}
      </div>

      {!isLoggedIn ? (
        <div className="auth-wrapper">
          <div className="card auth-card">
            <h2>{authMode === "login" ? "Login" : "Register"}</h2>

            <div className="auth-switch">
              <button
                type="button"
                className={authMode === "login" ? "active-tab-btn" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active-tab-btn" : ""}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                  />
                </div>
              ) : null}

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                />
              </div>

              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Login"
                  : "Create Account"}
              </button>
            </form>

            {authError ? <div className="error-box">{authError}</div> : null}
            {authMessage ? <div className="success-box">{authMessage}</div> : null}
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="tabs-row">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active-tab-btn" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "jobs" && <JobsTab token={token} user={user} />}

          {activeTab === "fix-errors" && (
            <PlaceholderTab
              title="Fix Errors"
              text="This tab is safe placeholder mode right now. Jobs/auth recovery first."
            />
          )}

          {activeTab === "resume-tailor" && (
            <PlaceholderTab
              title="Resume Tailor"
              text="This tab is safe placeholder mode right now. Jobs/auth recovery first."
            />
          )}

          {activeTab === "cover-letter" && (
            <PlaceholderTab
              title="Cover Letter"
              text="This tab is safe placeholder mode right now. Jobs/auth recovery first."
            />
          )}
        </div>
      )}
    </div>
  );
}
