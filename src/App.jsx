import React, { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [activeTab, setActiveTab] = useState("fix");

  const [errorText, setErrorText] = useState("");
  const [fixResult, setFixResult] = useState("");

  const [resumeText, setResumeText] = useState(
    localStorage.getItem("savedResume") || ""
  );
  const [jobDescription, setJobDescription] = useState("");
  const [resumeResult, setResumeResult] = useState("");

  const [coverResumeText, setCoverResumeText] = useState(
    localStorage.getItem("savedResume") || ""
  );
  const [coverJobDescription, setCoverJobDescription] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState("");

  const [jobSearch, setJobSearch] = useState("Node.js Backend Engineer");
  const [minimumScore, setMinimumScore] = useState(70);
  const [jobs, setJobs] = useState([]);

  const currentPlan = user?.plan || "free";
  const isPro = currentPlan === "pro" || currentPlan === "auto_apply";
  const autoApplyEnabled = currentPlan === "auto_apply";

  useEffect(() => {
    if (resumeText) {
      localStorage.setItem("savedResume", resumeText);
    }
  }, [resumeText]);

  useEffect(() => {
    if (coverResumeText) {
      localStorage.setItem("savedResume", coverResumeText);
    }
  }, [coverResumeText]);

  const saveAuth = (authToken, authUser) => {
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setMessage("Logged out.");
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied.");
    } catch {
      setMessage("Copy failed.");
    }
  };

  const saveResume = () => {
    localStorage.setItem("savedResume", resumeText);
    setCoverResumeText(resumeText);
    setMessage("Resume saved locally.");
  };

  const clearSavedResume = () => {
    localStorage.removeItem("savedResume");
    setResumeText("");
    setCoverResumeText("");
    setMessage("Saved resume cleared.");
  };

  const apiRequest = async (url, options = {}, needsAuth = true) => {
    const headers = {
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (needsAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setMessage("Enter email and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setMessage("");

      const data = await apiRequest(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        },
        false
      );

      const authToken = data.token;
      const authUser = data.user;

      if (!authToken || !authUser) {
        throw new Error("Login response missing token or user.");
      }

      saveAuth(authToken, authUser);
      setMessage("Login successful.");
    } catch (error) {
      setMessage(error.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (
      !registerName.trim() ||
      !registerEmail.trim() ||
      !registerPassword.trim()
    ) {
      setMessage("Enter name, email, and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setMessage("");

      const data = await apiRequest(
        `${API_BASE}/api/auth/register`,
        {
          method: "POST",
          body: JSON.stringify({
            name: registerName,
            email: registerEmail,
            password: registerPassword,
          }),
        },
        false
      );

      const authToken = data.token;
      const authUser = data.user;

      if (!authToken || !authUser) {
        throw new Error("Register response missing token or user.");
      }

      saveAuth(authToken, authUser);
      setMessage("Registration successful.");
    } catch (error) {
      setMessage(error.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFixErrors = async () => {
    if (!errorText.trim()) {
      setMessage("Paste the coding error first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setFixResult("");

      const data = await apiRequest(
        `${API_BASE}/api/screenshots`,
        {
          method: "POST",
          body: JSON.stringify({
            errorText,
          }),
        },
        false
      );

      setFixResult(data.result || "No result returned.");
      setMessage("Fix generated.");
    } catch (error) {
      setMessage(error.message || "Failed to analyze error.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTailor = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setMessage("Paste both resume and job description.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setResumeResult("");

      const data = await apiRequest(`${API_BASE}/api/resume-tailor`, {
        method: "POST",
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      const result =
        data.tailoredResume ||
        data.result ||
        data.resume ||
        "No tailored resume returned.";

      setResumeResult(result);
      setMessage("Resume tailored.");
    } catch (error) {
      setMessage(error.message || "Failed to tailor resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverLetter = async () => {
    if (!coverResumeText.trim() || !coverJobDescription.trim()) {
      setMessage("Paste both resume and job description for cover letter.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setCoverLetterResult("");

      const data = await apiRequest(`${API_BASE}/api/cover-letter`, {
        method: "POST",
        body: JSON.stringify({
          resumeText: coverResumeText,
          jobDescription: coverJobDescription,
        }),
      });

      const result =
        data.coverLetter ||
        data.result ||
        data.letter ||
        "No cover letter returned.";

      setCoverLetterResult(result);
      setMessage("Cover letter generated.");
    } catch (error) {
      setMessage(error.message || "Failed to generate cover letter.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchJobs = async () => {
    if (!jobSearch.trim()) {
      setMessage("Enter a job search.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setJobs([]);

      const payload = {
        search: jobSearch,
        limit: 12,
        minimumScore,
        remoteOnly: true,
        profileEmail: user?.email || "",
        profileName: user?.name || "Devendra Reddy Mekala",
        profilePhone: user?.phone || "",
        profileLinkedIn:
          user?.linkedin ||
          "https://www.linkedin.com/in/devendra-reddy-m-2492813a1",
        profileGitHub: user?.github || "https://github.com/devendrareddy23",
        resumeText:
          resumeText ||
          coverResumeText ||
          localStorage.getItem("savedResume") ||
          "",
        preferredRoles: "Backend Engineer, Node.js Developer",
        preferredLocations: "Remote, India, Worldwide, Europe",
      };

      const data = await apiRequest(
        `${API_BASE}/api/jobs/search`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        false
      );

      const foundJobs = data.jobs || data.results || [];
      setJobs(foundJobs);
      setMessage(`Found ${foundJobs.length} jobs.`);
    } catch (error) {
      setMessage(error.message || "Failed to search jobs.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePro = async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await apiRequest(`${API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        body: JSON.stringify({ plan: "pro" }),
      });

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Checkout URL not returned.");
    } catch (error) {
      setMessage(error.message || "Failed to start Pro checkout.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeAutoApply = async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await apiRequest(`${API_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        body: JSON.stringify({ plan: "auto_apply" }),
      });

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage("Checkout URL not returned.");
    } catch (error) {
      setMessage(error.message || "Failed to start Auto Apply checkout.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !user) {
    return (
      <div style={styles.appShell}>
        <div style={styles.authPage}>
          <div style={styles.authCard}>
            <div style={styles.brand}>HIREFLOW AI</div>
            <h1 style={styles.authTitle}>
              Find jobs. Tailor your resume. Generate cover letters.
            </h1>
            <p style={styles.authSubTitle}>
              Private login for every user. No shared data across accounts.
            </p>

            <div style={styles.authTabs}>
              <button
                onClick={() => setAuthMode("login")}
                style={
                  authMode === "login"
                    ? styles.activeTabButton
                    : styles.tabButton
                }
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode("register")}
                style={
                  authMode === "register"
                    ? styles.activeTabButton
                    : styles.tabButton
                }
              >
                Register
              </button>
            </div>

            {message ? <div style={styles.messageBox}>{message}</div> : null}

            {authMode === "login" && (
              <div>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />

                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />

                <button
                  onClick={handleLogin}
                  style={styles.primaryButton}
                  disabled={authLoading}
                >
                  {authLoading ? "Logging in..." : "Login"}
                </button>
              </div>
            )}

            {authMode === "register" && (
              <div>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Enter your name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />

                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />

                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Create a password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />

                <button
                  onClick={handleRegister}
                  style={styles.primaryButton}
                  disabled={authLoading}
                >
                  {authLoading ? "Creating account..." : "Register"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      <div style={styles.page}>
        <div style={styles.heroCard}>
          <div style={styles.headerRow}>
            <div>
              <div style={styles.brand}>HIREFLOW AI</div>
              <h1 style={styles.mainTitle}>
                Fix coding errors, tailor your resume, generate cover letters,
                and find jobs.
              </h1>
              <p style={styles.subTitle}>
                Logged in as <strong>{user.email}</strong> · Plan{" "}
                <strong>{currentPlan}</strong>
              </p>
            </div>

            <button onClick={logout} style={styles.secondaryButton}>
              Logout
            </button>
          </div>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>CURRENT PLAN</div>
              <div style={styles.statValue}>
                {currentPlan === "auto_apply" ? "Auto Apply" : currentPlan}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>ACCOUNT STATUS</div>
              <div style={styles.statValue}>Active</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>RESUME TAILOR</div>
              <div style={styles.statValue}>
                {isPro ? "Unlocked" : "Limited"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>AUTO APPLY</div>
              <div style={styles.statValue}>
                {autoApplyEnabled ? "Enabled" : "Not enabled"}
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            {!isPro ? (
              <button onClick={handleUpgradePro} style={styles.primaryButton}>
                Upgrade to Pro
              </button>
            ) : (
              <button style={styles.primaryButtonDisabled} disabled>
                Pro Active
              </button>
            )}

            {!autoApplyEnabled ? (
              <button
                onClick={handleUpgradeAutoApply}
                style={styles.secondaryButton}
              >
                Get Auto Apply
              </button>
            ) : (
              <button style={styles.primaryButtonDisabled} disabled>
                Auto Apply Active
              </button>
            )}
          </div>

          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab("fix")}
              style={
                activeTab === "fix" ? styles.activeTabButton : styles.tabButton
              }
            >
              Fix Errors
            </button>

            <button
              onClick={() => setActiveTab("resume")}
              style={
                activeTab === "resume"
                  ? styles.activeTabButton
                  : styles.tabButton
              }
            >
              Resume Tailor
            </button>

            <button
              onClick={() => setActiveTab("cover")}
              style={
                activeTab === "cover"
                  ? styles.activeTabButton
                  : styles.tabButton
              }
            >
              Cover Letter
            </button>

            <button
              onClick={() => setActiveTab("jobs")}
              style={
                activeTab === "jobs" ? styles.activeTabButton : styles.tabButton
              }
            >
              Jobs
            </button>
          </div>
        </div>

        {message ? (
          <div style={styles.messageBox}>
            {loading ? "Working... " : ""}
            {message}
          </div>
        ) : null}

        {activeTab === "fix" && (
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Fix Errors</h2>
            <p style={styles.sectionText}>
              Paste the coding error and get a structured fix.
            </p>

            <textarea
              style={styles.textarea}
              placeholder="Paste your coding error here..."
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
            />

            <div style={styles.inlineButtons}>
              <button
                onClick={handleFixErrors}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze Error"}
              </button>
              <button
                onClick={() => copyText(fixResult)}
                style={styles.secondaryButton}
                disabled={!fixResult}
              >
                Copy Result
              </button>
            </div>

            {fixResult ? <pre style={styles.resultBox}>{fixResult}</pre> : null}
          </div>
        )}

        {activeTab === "resume" && (
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Resume Tailor</h2>
            <p style={styles.sectionText}>
              Match your resume to a job description without rewriting
              everything manually.
            </p>

            <label style={styles.label}>Saved Resume</label>
            <textarea
              style={styles.textarea}
              placeholder="Paste your full resume here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />

            <div style={styles.inlineButtons}>
              <button onClick={saveResume} style={styles.secondaryButton}>
                Save Resume
              </button>
              <button onClick={clearSavedResume} style={styles.secondaryButton}>
                Clear Saved Resume
              </button>
            </div>

            <label style={styles.label}>Job Description</label>
            <textarea
              style={styles.textarea}
              placeholder="Paste the target job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            <div style={styles.inlineButtons}>
              <button
                onClick={handleResumeTailor}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? "Tailoring..." : "Tailor Resume"}
              </button>
              <button
                onClick={() => copyText(resumeResult)}
                style={styles.secondaryButton}
                disabled={!resumeResult}
              >
                Copy Result
              </button>
            </div>

            {resumeResult ? (
              <pre style={styles.resultBox}>{resumeResult}</pre>
            ) : null}
          </div>
        )}

        {activeTab === "cover" && (
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Cover Letter Generator</h2>
            <p style={styles.sectionText}>
              Generate a clean, job-specific cover letter from your resume and
              JD.
            </p>

            <label style={styles.label}>Resume</label>
            <textarea
              style={styles.textarea}
              placeholder="Paste your resume here..."
              value={coverResumeText}
              onChange={(e) => setCoverResumeText(e.target.value)}
            />

            <div style={styles.inlineButtons}>
              <button
                onClick={() => {
                  setCoverResumeText(localStorage.getItem("savedResume") || "");
                  setMessage("Loaded saved resume into cover letter section.");
                }}
                style={styles.secondaryButton}
              >
                Load Saved Resume
              </button>
            </div>

            <label style={styles.label}>Job Description</label>
            <textarea
              style={styles.textarea}
              placeholder="Paste the target job description here..."
              value={coverJobDescription}
              onChange={(e) => setCoverJobDescription(e.target.value)}
            />

            <div style={styles.inlineButtons}>
              <button
                onClick={handleCoverLetter}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Cover Letter"}
              </button>
              <button
                onClick={() => copyText(coverLetterResult)}
                style={styles.secondaryButton}
                disabled={!coverLetterResult}
              >
                Copy Result
              </button>
            </div>

            {coverLetterResult ? (
              <pre style={styles.resultBox}>{coverLetterResult}</pre>
            ) : null}
          </div>
        )}

        {activeTab === "jobs" && (
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Job Finder</h2>
            <p style={styles.sectionText}>
              Search jobs and score them against your profile.
            </p>

            <label style={styles.label}>Job Search</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Node.js Backend Engineer"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
            />

            <label style={styles.label}>Minimum Score</label>
            <input
              type="number"
              style={styles.input}
              min="0"
              max="100"
              value={minimumScore}
              onChange={(e) => setMinimumScore(Number(e.target.value))}
            />

            <div style={styles.inlineButtons}>
              <button
                onClick={handleSearchJobs}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search Jobs"}
              </button>
            </div>

            <div style={styles.jobsList}>
              {jobs.length === 0 ? (
                <div style={styles.emptyState}>No jobs loaded yet.</div>
              ) : (
                jobs.map((job, index) => (
                  <div
                    key={job._id || job.jobId || index}
                    style={styles.jobCard}
                  >
                    <h3 style={styles.jobTitle}>{job.title || "Untitled Role"}</h3>
                    <p style={styles.jobMeta}>
                      <strong>Company:</strong> {job.company || "Unknown"}
                    </p>
                    <p style={styles.jobMeta}>
                      <strong>Location:</strong> {job.location || "Not provided"}
                    </p>
                    <p style={styles.jobMeta}>
                      <strong>Score:</strong> {job.score ?? "N/A"}
                    </p>

                    {job.redirect_url || job.url ? (
                      <a
                        href={job.redirect_url || job.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.jobLink}
                      >
                        Open Job
                      </a>
                    ) : null}

                    {job.description ? (
                      <p style={styles.jobDescription}>
                        {job.description.slice(0, 250)}...
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  appShell: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #041a5c 0%, #07297d 45%, #031543 100%)",
    color: "#ffffff",
    padding: "24px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  authPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  authCard: {
    width: "100%",
    maxWidth: "520px",
    background: "rgba(9, 30, 100, 0.88)",
    border: "1px solid rgba(130, 180, 255, 0.35)",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  },
  authTitle: {
    fontSize: "34px",
    lineHeight: 1.15,
    margin: "0 0 12px 0",
  },
  authSubTitle: {
    marginTop: 0,
    marginBottom: "20px",
    opacity: 0.9,
  },
  authTabs: {
    display: "flex",
    gap: "12px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  heroCard: {
    background: "rgba(9, 30, 100, 0.88)",
    border: "1px solid rgba(130, 180, 255, 0.35)",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
    marginBottom: "20px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  brand: {
    fontSize: "14px",
    fontWeight: "800",
    letterSpacing: "2px",
    color: "#7be7ff",
    marginBottom: "10px",
  },
  mainTitle: {
    fontSize: "42px",
    lineHeight: 1.15,
    margin: "0 0 12px 0",
    maxWidth: "800px",
  },
  subTitle: {
    fontSize: "18px",
    opacity: 0.92,
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "24px",
  },
  statCard: {
    background:
      "linear-gradient(180deg, rgba(23,78,214,0.55), rgba(7,32,104,0.7))",
    border: "1px solid rgba(136, 183, 255, 0.35)",
    borderRadius: "20px",
    padding: "20px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "1px",
    opacity: 0.85,
    marginBottom: "10px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "800",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  tabs: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "22px",
  },
  tabButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "700",
    cursor: "pointer",
    background: "#91a3c7",
    color: "#ffffff",
  },
  activeTabButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "700",
    cursor: "pointer",
    background: "linear-gradient(90deg, #41e2ff, #72ff9b)",
    color: "#03235e",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "800",
    cursor: "pointer",
    background: "linear-gradient(90deg, #41e2ff, #72ff9b)",
    color: "#03235e",
  },
  primaryButtonDisabled: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "800",
    background: "#6076a5",
    color: "#d9e4ff",
    cursor: "not-allowed",
  },
  secondaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: "700",
    cursor: "pointer",
    background: "#8f9fc6",
    color: "#ffffff",
  },
  messageBox: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",
    padding: "12px 16px",
    marginBottom: "18px",
  },
  sectionCard: {
    background: "rgba(9, 30, 100, 0.88)",
    border: "1px solid rgba(130, 180, 255, 0.35)",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  },
  sectionTitle: {
    fontSize: "32px",
    marginTop: 0,
    marginBottom: "8px",
  },
  sectionText: {
    marginTop: 0,
    opacity: 0.92,
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontWeight: "700",
    marginBottom: "10px",
    marginTop: "8px",
  },
  textarea: {
    width: "100%",
    minHeight: "180px",
    resize: "vertical",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(150,190,255,0.35)",
    background: "#061b63",
    color: "#ffffff",
    fontSize: "16px",
    marginBottom: "14px",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(150,190,255,0.35)",
    background: "#061b63",
    color: "#ffffff",
    fontSize: "16px",
    marginBottom: "14px",
    boxSizing: "border-box",
  },
  inlineButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  resultBox: {
    whiteSpace: "pre-wrap",
    background: "#041548",
    border: "1px solid rgba(150,190,255,0.35)",
    borderRadius: "16px",
    padding: "18px",
    overflowX: "auto",
    fontSize: "15px",
    lineHeight: 1.55,
  },
  jobsList: {
    display: "grid",
    gap: "16px",
    marginTop: "20px",
  },
  emptyState: {
    background: "#041548",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid rgba(150,190,255,0.25)",
    opacity: 0.85,
  },
  jobCard: {
    background: "#041548",
    borderRadius: "18px",
    padding: "18px",
    border: "1px solid rgba(150,190,255,0.25)",
  },
  jobTitle: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "22px",
  },
  jobMeta: {
    margin: "6px 0",
    opacity: 0.95,
  },
  jobDescription: {
    marginTop: "12px",
    opacity: 0.85,
    lineHeight: 1.5,
  },
  jobLink: {
    display: "inline-block",
    marginTop: "10px",
    color: "#7be7ff",
    fontWeight: "700",
    textDecoration: "none",
  },
};

export default App;
