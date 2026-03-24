import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [activeTab, setActiveTab] = useState("fix-errors");

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [errorText, setErrorText] = useState("");
  const [fixResult, setFixResult] = useState("");
  const [fixLoading, setFixLoading] = useState(false);

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeResult, setResumeResult] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const savedResume = localStorage.getItem("saved_resume_text");
    const savedFixHistory = localStorage.getItem("fix_history");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
      }
    }

    if (savedResume) {
      setResumeText(savedResume);
    }

    if (!savedFixHistory) {
      localStorage.setItem("fix_history", JSON.stringify([]));
    }
  }, []);

  const isPro = user?.plan === "pro" || user?.plan === "auto";
  const isAuto = user?.plan === "auto";

  const parsedResumeSections = useMemo(() => {
    if (!resumeResult) return [];

    const sectionTitles = [
      "MATCH SCORE:",
      "MISSING KEYWORDS:",
      "TAILORED SUMMARY:",
      "TAILORED EXPERIENCE:",
      "TAILORED SKILLS:",
      "RECRUITER MESSAGE:",
      "RESUME:",
    ];

    const sections = [];

    for (let i = 0; i < sectionTitles.length; i += 1) {
      const title = sectionTitles[i];
      const startIndex = resumeResult.indexOf(title);

      if (startIndex === -1) continue;

      let endIndex = resumeResult.length;

      for (let j = i + 1; j < sectionTitles.length; j += 1) {
        const nextIndex = resumeResult.indexOf(
          sectionTitles[j],
          startIndex + title.length
        );

        if (nextIndex !== -1) {
          endIndex = nextIndex;
          break;
        }
      }

      const content = resumeResult
        .slice(startIndex + title.length, endIndex)
        .trim();

      sections.push({
        title: title.replace(":", ""),
        content,
      });
    }

    if (sections.length) return sections;

    return [{ title: "RESULT", content: resumeResult }];
  }, [resumeResult]);

  const saveFixToHistory = (rawInput, result) => {
    try {
      const existingHistory = JSON.parse(
        localStorage.getItem("fix_history") || "[]"
      );

      const newEntry = {
        id: Date.now(),
        createdAt: new Date().toLocaleString(),
        rawInput,
        result,
      };

      const updatedHistory = [newEntry, ...existingHistory].slice(0, 10);
      localStorage.setItem("fix_history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save fix history:", error);
    }
  };

  const handleCopy = async (textToCopy, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert(label);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Copy failed");
    }
  };

  const handleSaveResume = () => {
    localStorage.setItem("saved_resume_text", resumeText);
    alert("Resume saved locally.");
  };

  const handleClearResume = () => {
    localStorage.removeItem("saved_resume_text");
    setResumeText("");
    alert("Saved resume cleared.");
  };

  const handleAuth = async () => {
    if (!authEmail.trim()) {
      alert("Enter email.");
      return;
    }

    if (!authPassword.trim()) {
      alert("Enter password.");
      return;
    }

    if (authMode === "register" && !authName.trim()) {
      alert("Enter name.");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";

      const payload =
        authMode === "login"
          ? {
              email: authEmail,
              password: authPassword,
            }
          : {
              name: authName,
              email: authEmail,
              password: authPassword,
            };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `${authMode} failed.`);
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (error) {
      console.error("Auth failed:", error);
      alert(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken("");
    setFixResult("");
    setResumeResult("");
  };

  const handleAnalyzeError = async () => {
    if (!errorText.trim()) {
      alert("Paste an error first.");
      return;
    }

    if (!token) {
      alert("Login required.");
      return;
    }

    try {
      setFixLoading(true);
      setFixResult("");

      const response = await fetch(`${API_BASE}/api/screenshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          errorText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to analyze error.");
      }

      const resultText = data.explanation || data.result || "No result found.";
      setFixResult(resultText);
      saveFixToHistory(errorText, resultText);
    } catch (error) {
      console.error("Analyze error failed:", error);
      alert(error.message || "Failed to analyze error.");
    } finally {
      setFixLoading(false);
    }
  };

  const handleTailorResume = async () => {
    if (!resumeText.trim()) {
      alert("Paste your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Paste the job description first.");
      return;
    }

    if (!token) {
      alert("Login required.");
      return;
    }

    if (!isPro) {
      alert("Upgrade to Pro to use Resume Tailor.");
      return;
    }

    try {
      setResumeLoading(true);
      setResumeResult("");

      const response = await fetch(`${API_BASE}/api/resume-tailor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to tailor resume.");
      }

      setResumeResult(data.result || "No tailored result returned.");
    } catch (error) {
      console.error("Resume tailor failed:", error);
      alert(error.message || "Failed to tailor resume.");
    } finally {
      setResumeLoading(false);
    }
  };

  const startCheckout = async (plan) => {
    if (!token) {
      alert("Login required.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/billing/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.message || "Failed to create checkout session.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout failed:", error);
      alert(error.message || "Checkout failed.");
    }
  };

  if (!user) {
    return (
      <div className="app-shell">
        <div className="hero-card">
          <p className="eyebrow">HIREFLOW AI</p>
          <h1>Login to your job search workspace.</h1>
          <p className="hero-text">
            Resume tailoring, error fixing, premium access, and account-based
            job workflow in one place.
          </p>

          <div className="tab-row">
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "tab active" : "tab"}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>
        </div>

        <div className="tool-card">
          <h2>{authMode === "login" ? "Welcome back" : "Create account"}</h2>

          {authMode === "register" && (
            <div className="field-group">
              <label>Name</label>
              <input
                className="text-input"
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="field-group">
            <label>Email</label>
            <input
              className="text-input"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input
              className="text-input"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button
            className="primary-button"
            onClick={handleAuth}
            disabled={authLoading}
          >
            {authLoading
              ? authMode === "login"
                ? "Logging in..."
                : "Creating account..."
              : authMode === "login"
              ? "Login"
              : "Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="hero-card">
        <div className="top-bar">
          <div>
            <p className="eyebrow">HIREFLOW AI</p>
            <h1>Fix coding errors and tailor your resume fast.</h1>
            <p className="hero-text">
              Logged in as <strong>{user.email}</strong> · Plan{" "}
              <strong>{user.plan || "free"}</strong>
            </p>
          </div>

          <button className="secondary-button" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <span className="status-label">Current plan</span>
            <strong>{isAuto ? "Auto" : isPro ? "Pro" : "Free"}</strong>
          </div>

          <div className="status-card">
            <span className="status-label">Account status</span>
            <strong>{isPro ? "Active" : "Free tier"}</strong>
          </div>

          <div className="status-card">
            <span className="status-label">Resume Tailor</span>
            <strong>{isPro ? "Unlocked" : "Upgrade required"}</strong>
          </div>

          <div className="status-card">
            <span className="status-label">Auto Apply</span>
            <strong>{isAuto ? "Unlocked" : "Not enabled"}</strong>
          </div>
        </div>

        <div className="billing-row">
          <button className="primary-button" onClick={() => startCheckout("pro")}>
            Upgrade to Pro
          </button>
          <button className="secondary-button" onClick={() => startCheckout("auto")}>
            Get Auto Apply
          </button>
        </div>

        <div className="tab-row">
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
        </div>
      </div>

      {activeTab === "fix-errors" && (
        <div className="tool-card">
          <h2>Fix Coding Errors</h2>
          <p className="section-text">
            Paste the raw error. The backend will return a structured fix.
          </p>

          <div className="field-group">
            <label>Paste Error</label>
            <textarea
              className="big-textarea"
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Paste your error, stack trace, terminal issue, or screenshot-extracted text here..."
            />
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={handleAnalyzeError}
              disabled={fixLoading}
            >
              {fixLoading ? "Analyzing..." : "Analyze Error"}
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                setErrorText("");
                setFixResult("");
              }}
            >
              Clear
            </button>
          </div>

          {fixResult && (
            <div className="result-card">
              <div className="result-header">
                <h3>Structured Fix</h3>
                <button
                  className="secondary-button"
                  onClick={() => handleCopy(fixResult, "Fix copied")}
                >
                  Copy
                </button>
              </div>

              <pre className="result-pre">{fixResult}</pre>
            </div>
          )}
        </div>
      )}

      {activeTab === "resume-tailor" && (
        <div className="tool-card">
          <h2>Resume Tailor</h2>
          <p className="section-text">
            Match your resume to a job description without rewriting everything
            manually.
          </p>

          {!isPro && (
            <div className="warning-card">
              Resume Tailor is locked for free users. Upgrade to Pro to unlock
              this section.
            </div>
          )}

          <div className="field-group">
            <label>Saved Resume</label>
            <textarea
              className="big-textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your full resume here..."
            />
          </div>

          <div className="button-row">
            <button className="secondary-button" onClick={handleSaveResume}>
              Save Resume
            </button>
            <button className="secondary-button" onClick={handleClearResume}>
              Clear Saved Resume
            </button>
          </div>

          <div className="field-group">
            <label>Job Description</label>
            <textarea
              className="big-textarea"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here..."
            />
          </div>

          <div className="button-row">
            <button
              className="primary-button"
              onClick={handleTailorResume}
              disabled={resumeLoading || !isPro}
            >
              {resumeLoading ? "Tailoring..." : "Tailor Resume"}
            </button>
          </div>

          {parsedResumeSections.length > 0 && (
            <div className="result-stack">
              {parsedResumeSections.map((section) => (
                <div className="result-card" key={section.title}>
                  <div className="result-header">
                    <h3>{section.title}</h3>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        handleCopy(section.content, `${section.title} copied`)
                      }
                    >
                      Copy
                    </button>
                  </div>

                  <pre className="result-pre">{section.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
