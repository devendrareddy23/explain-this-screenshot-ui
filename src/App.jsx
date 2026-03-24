import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("fix-errors");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [fixErrorsForm, setFixErrorsForm] = useState({
    errorText: "",
  });
  const [fixErrorsLoading, setFixErrorsLoading] = useState(false);
  const [fixErrorsResult, setFixErrorsResult] = useState("");

  const [resumeForm, setResumeForm] = useState({
    resumeText: "",
    jobDescription: "",
  });
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeResult, setResumeResult] = useState("");

  const [coverLetterForm, setCoverLetterForm] = useState({
    resumeText: "",
    jobDescription: "",
    companyName: "",
    roleTitle: "",
  });
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterResult, setCoverLetterResult] = useState("");

  const isLoggedIn = !!token;
  const isPro = user?.plan === "pro";

  const authHeaders = useMemo(() => {
    if (!token) return { "Content-Type": "application/json" };
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  useEffect(() => {
    const savedResumeText = localStorage.getItem("savedResumeText") || "";
    if (savedResumeText) {
      setResumeForm((prev) => ({ ...prev, resumeText: savedResumeText }));
      setCoverLetterForm((prev) => ({ ...prev, resumeText: savedResumeText }));
    }
  }, []);

  useEffect(() => {
    if (resumeForm.resumeText) {
      localStorage.setItem("savedResumeText", resumeForm.resumeText);
    }
  }, [resumeForm.resumeText]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    let ignore = false;

    const fetchMe = async () => {
      setLoadingUser(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load user.");
        }

        if (!ignore) {
          setUser(data.user);
          if (data.user?.savedResumeText) {
            setResumeForm((prev) => ({
              ...prev,
              resumeText: prev.resumeText || data.user.savedResumeText,
            }));
            setCoverLetterForm((prev) => ({
              ...prev,
              resumeText: prev.resumeText || data.user.savedResumeText,
            }));
          }
        }
      } catch (error) {
        console.error("Fetch /api/auth/me error:", error.message);
        localStorage.removeItem("token");
        if (!ignore) {
          setToken("");
          setUser(null);
          setMessage("Session expired. Please login again.");
        }
      } finally {
        if (!ignore) {
          setLoadingUser(false);
        }
      }
    };

    fetchMe();

    return () => {
      ignore = true;
    };
  }, [token]);

  const clearMessage = () => setMessage("");

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessage();
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed.");
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user || null);
      setMessage("Login successful.");
      setLoginForm({ email: "", password: "" });
    } catch (error) {
      setMessage(error.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessage();
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registration failed.");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
      }

      setUser(data.user || null);
      setMessage("Registration successful.");
      setRegisterForm({ name: "", email: "", password: "" });
    } catch (error) {
      setMessage(error.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setMessage("Logged out.");
    setActiveTab("fix-errors");
  };

  const requirePro = () => {
    if (!isLoggedIn) {
      setMessage("Please login first.");
      return false;
    }

    if (!isPro) {
      setMessage("Upgrade to Pro to use this feature.");
      return false;
    }

    return true;
  };

  const handleFixErrors = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!fixErrorsForm.errorText.trim()) {
      setMessage("Paste an error or screenshot text first.");
      return;
    }

    if (!requirePro()) return;

    setFixErrorsLoading(true);
    setFixErrorsResult("");

    try {
      const res = await fetch(`${API_BASE}/api/screenshots`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          errorText: fixErrorsForm.errorText,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Fix Errors request failed.");
      }

      const resultText =
        data.result ||
        data.output ||
        data.answer ||
        JSON.stringify(data, null, 2);

      setFixErrorsResult(resultText);
      setMessage("Fix Errors completed.");
    } catch (error) {
      setMessage(error.message || "Fix Errors failed.");
    } finally {
      setFixErrorsLoading(false);
    }
  };

  const handleResumeTailor = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!resumeForm.resumeText.trim() || !resumeForm.jobDescription.trim()) {
      setMessage("Resume text and job description are required.");
      return;
    }

    if (!requirePro()) return;

    setResumeLoading(true);
    setResumeResult("");

    try {
      const res = await fetch(`${API_BASE}/api/resume-tailor`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          resumeText: resumeForm.resumeText,
          jobDescription: resumeForm.jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Resume tailoring failed.");
      }

      const resultText =
        data.tailoredResume ||
        data.result ||
        data.output ||
        JSON.stringify(data, null, 2);

      setResumeResult(resultText);
      setMessage("Resume tailored successfully.");
    } catch (error) {
      setMessage(error.message || "Resume tailoring failed.");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleCoverLetter = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!coverLetterForm.resumeText.trim() || !coverLetterForm.jobDescription.trim()) {
      setMessage("Resume text and job description are required.");
      return;
    }

    if (!requirePro()) return;

    setCoverLetterLoading(true);
    setCoverLetterResult("");

    try {
      const res = await fetch(`${API_BASE}/api/cover-letter/generate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          resumeText: coverLetterForm.resumeText,
          jobDescription: coverLetterForm.jobDescription,
          companyName: coverLetterForm.companyName,
          roleTitle: coverLetterForm.roleTitle,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Cover letter generation failed.");
      }

      const resultText =
        data.coverLetter ||
        data.result ||
        data.output ||
        JSON.stringify(data, null, 2);

      setCoverLetterResult(resultText);
      setMessage("Cover letter generated successfully.");
    } catch (error) {
      setMessage(error.message || "Cover letter generation failed.");
    } finally {
      setCoverLetterLoading(false);
    }
  };

  const handleUpgradePro = async () => {
    clearMessage();

    if (!isLoggedIn) {
      setMessage("Please login before upgrading.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ plan: "pro" }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Checkout creation failed.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Checkout session created, but no redirect URL was returned.");
    } catch (error) {
      setMessage(error.message || "Upgrade failed.");
    }
  };

  const renderAuthCard = () => {
    if (authMode === "login") {
      return (
        <form className="card auth-card" onSubmit={handleLogin}>
          <h2>Welcome back</h2>
          <p className="muted">Login to access your private HireFlow AI workspace.</p>

          <label>Email</label>
          <input
            type="email"
            value={loginForm.email}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Enter your password"
            required
          />

          <button type="submit" disabled={authLoading}>
            {authLoading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              clearMessage();
              setAuthMode("register");
            }}
          >
            Need an account? Register
          </button>
        </form>
      );
    }

    return (
      <form className="card auth-card" onSubmit={handleRegister}>
        <h2>Create account</h2>
        <p className="muted">Your data stays private to your account.</p>

        <label>Name</label>
        <input
          type="text"
          value={registerForm.name}
          onChange={(e) =>
            setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter your name"
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={registerForm.email}
          onChange={(e) =>
            setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={registerForm.password}
          onChange={(e) =>
            setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Create a password"
          required
        />

        <button type="submit" disabled={authLoading}>
          {authLoading ? "Creating account..." : "Register"}
        </button>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            clearMessage();
            setAuthMode("login");
          }}
        >
          Already have an account? Login
        </button>
      </form>
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>HireFlow AI</h1>
          <p className="muted">
            Developer Career Toolkit — private accounts, AI tools, and paid access.
          </p>
        </div>

        <div className="topbar-right">
          <div className="status-card">
            <div><strong>API Base:</strong> {API_BASE}</div>
            <div>
              <strong>Plan:</strong>{" "}
              {loadingUser ? "Loading..." : user?.plan?.toUpperCase() || "FREE"}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              {loadingUser ? "Loading..." : user?.subscriptionStatus || "inactive"}
            </div>
          </div>

          {isLoggedIn ? (
            <button className="secondary-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : null}
        </div>
      </header>

      {message ? <div className="message-box">{message}</div> : null}

      {!isLoggedIn ? (
        <main className="auth-layout">{renderAuthCard()}</main>
      ) : (
        <main className="dashboard-layout">
          <section className="card dashboard-card">
            <h2>HireFlow Dashboard</h2>
            <p><strong>Email:</strong> {user?.email || "Loading..."}</p>
            <p><strong>Name:</strong> {user?.name || "Loading..."}</p>
            <p><strong>Plan:</strong> {loadingUser ? "Loading..." : user?.plan?.toUpperCase() || "FREE"}</p>
            <p><strong>Status:</strong> {loadingUser ? "Loading..." : user?.subscriptionStatus || "inactive"}</p>

            {!isPro && !loadingUser ? (
              <button onClick={handleUpgradePro}>Upgrade to Pro</button>
            ) : null}
          </section>

          <section className="tabs-row">
            <button
              className={activeTab === "fix-errors" ? "tab active" : "tab"}
              onClick={() => setActiveTab("fix-errors")}
            >
              Fix Errors
            </button>
            <button
              className={activeTab === "resume-tailor" ? "tab active" : "tab"}
              onClick={() => setActiveTab("resume-tailor")}
            >
              Resume Tailor
            </button>
            <button
              className={activeTab === "cover-letter" ? "tab active" : "tab"}
              onClick={() => setActiveTab("cover-letter")}
            >
              Cover Letter
            </button>
          </section>

          {activeTab === "fix-errors" && (
            <section className="card tool-card">
              <h2>Fix Errors</h2>
              <p className="muted">
                Paste coding error text and get an AI explanation + fix path.
              </p>

              <form onSubmit={handleFixErrors}>
                <label>Error Text</label>
                <textarea
                  rows="10"
                  value={fixErrorsForm.errorText}
                  onChange={(e) =>
                    setFixErrorsForm({ errorText: e.target.value })
                  }
                  placeholder="Paste terminal error, stack trace, or problem here..."
                />

                <button type="submit" disabled={fixErrorsLoading}>
                  {fixErrorsLoading ? "Analyzing..." : "Analyze Error"}
                </button>
              </form>

              {fixErrorsResult ? (
                <div className="result-box">
                  <h3>Result</h3>
                  <pre>{fixErrorsResult}</pre>
                </div>
              ) : null}
            </section>
          )}

          {activeTab === "resume-tailor" && (
            <section className="card tool-card">
              <h2>Resume Tailor</h2>
              <p className="muted">
                Use your stored resume text and tailor it to the job description.
              </p>

              <form onSubmit={handleResumeTailor}>
                <label>Resume Text</label>
                <textarea
                  rows="12"
                  value={resumeForm.resumeText}
                  onChange={(e) =>
                    setResumeForm((prev) => ({
                      ...prev,
                      resumeText: e.target.value,
                    }))
                  }
                  placeholder="Paste your full resume text..."
                />

                <label>Job Description</label>
                <textarea
                  rows="12"
                  value={resumeForm.jobDescription}
                  onChange={(e) =>
                    setResumeForm((prev) => ({
                      ...prev,
                      jobDescription: e.target.value,
                    }))
                  }
                  placeholder="Paste the job description..."
                />

                <button type="submit" disabled={resumeLoading}>
                  {resumeLoading ? "Tailoring..." : "Tailor Resume"}
                </button>
              </form>

              {resumeResult ? (
                <div className="result-box">
                  <h3>Tailored Resume</h3>
                  <pre>{resumeResult}</pre>
                </div>
              ) : null}
            </section>
          )}

          {activeTab === "cover-letter" && (
            <section className="card tool-card">
              <h2>Cover Letter</h2>
              <p className="muted">
                Generate a job-specific cover letter using your resume and JD.
              </p>

              <form onSubmit={handleCoverLetter}>
                <label>Company Name</label>
                <input
                  type="text"
                  value={coverLetterForm.companyName}
                  onChange={(e) =>
                    setCoverLetterForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />

                <label>Role Title</label>
                <input
                  type="text"
                  value={coverLetterForm.roleTitle}
                  onChange={(e) =>
                    setCoverLetterForm((prev) => ({
                      ...prev,
                      roleTitle: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />

                <label>Resume Text</label>
                <textarea
                  rows="12"
                  value={coverLetterForm.resumeText}
                  onChange={(e) =>
                    setCoverLetterForm((prev) => ({
                      ...prev,
                      resumeText: e.target.value,
                    }))
                  }
                  placeholder="Paste your full resume text..."
                />

                <label>Job Description</label>
                <textarea
                  rows="12"
                  value={coverLetterForm.jobDescription}
                  onChange={(e) =>
                    setCoverLetterForm((prev) => ({
                      ...prev,
                      jobDescription: e.target.value,
                    }))
                  }
                  placeholder="Paste the job description..."
                />

                <button type="submit" disabled={coverLetterLoading}>
                  {coverLetterLoading ? "Generating..." : "Generate Cover Letter"}
                </button>
              </form>

              {coverLetterResult ? (
                <div className="result-box">
                  <h3>Generated Cover Letter</h3>
                  <pre>{coverLetterResult}</pre>
                </div>
              ) : null}
            </section>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
