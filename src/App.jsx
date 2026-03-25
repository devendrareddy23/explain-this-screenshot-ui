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

  const [jobSearchForm, setJobSearchForm] = useState({
    search: "",
    location: "",
    remoteOnly: true,
    country: "in",
  });
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobResults, setJobResults] = useState([]);

  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);

  const isLoggedIn = !!token;
  const isPro = user?.plan === "pro";
  const hasSavedResume = !!user?.savedResumeText?.trim();

  const authHeaders = useMemo(() => {
    if (!token) {
      return { "Content-Type": "application/json" };
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

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

  useEffect(() => {
    if (isLoggedIn && activeTab === "jobs") {
      fetchSavedJobs();
    }
  }, [isLoggedIn, activeTab]);

  const clearMessage = () => setMessage("");

  const clearToolForms = () => {
    setFixErrorsForm({ errorText: "" });
    setFixErrorsResult("");

    setResumeForm({
      resumeText: "",
      jobDescription: "",
    });
    setResumeResult("");

    setCoverLetterForm({
      resumeText: "",
      jobDescription: "",
      companyName: "",
      roleTitle: "",
    });
    setCoverLetterResult("");

    setJobSearchForm({
      search: "",
      location: "",
      remoteOnly: true,
      country: "in",
    });
    setJobResults([]);
    setSavedJobs([]);
  };

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
      clearToolForms();
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
      clearToolForms();
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
    clearToolForms();
    setMessage("Logged out.");
    setActiveTab("fix-errors");
  };

  const requireLogin = () => {
    if (!isLoggedIn) {
      setMessage("Please login first.");
      return false;
    }
    return true;
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

  const handleLoadSavedResumeForResumeTailor = () => {
    clearMessage();

    if (!hasSavedResume) {
      setMessage("No saved resume found in your account.");
      return;
    }

    setResumeForm((prev) => ({
      ...prev,
      resumeText: user.savedResumeText,
    }));

    setMessage("Saved resume loaded into Resume Tailor.");
  };

  const handleLoadSavedResumeForCoverLetter = () => {
    clearMessage();

    if (!hasSavedResume) {
      setMessage("No saved resume found in your account.");
      return;
    }

    setCoverLetterForm((prev) => ({
      ...prev,
      resumeText: user.savedResumeText,
    }));

    setMessage("Saved resume loaded into Cover Letter.");
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
        throw new Error(data.message || "Resume Tailor request failed.");
      }

      const resultText =
        data.tailoredResume ||
        data.result ||
        data.output ||
        JSON.stringify(data, null, 2);

      setResumeResult(resultText);
      setMessage("Resume Tailor completed.");
    } catch (error) {
      setMessage(error.message || "Resume Tailor failed.");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleCoverLetter = async (e) => {
    e.preventDefault();
    clearMessage();

    if (
      !coverLetterForm.resumeText.trim() ||
      !coverLetterForm.jobDescription.trim()
    ) {
      setMessage("Resume text and job description are required.");
      return;
    }

    if (!requirePro()) return;

    setCoverLetterLoading(true);
    setCoverLetterResult("");

    try {
      const res = await fetch(`${API_BASE}/api/cover-letter`, {
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
        throw new Error(data.message || "Cover Letter request failed.");
      }

      const resultText =
        data.coverLetter ||
        data.result ||
        data.output ||
        JSON.stringify(data, null, 2);

      setCoverLetterResult(resultText);
      setMessage("Cover Letter completed.");
    } catch (error) {
      setMessage(error.message || "Cover Letter failed.");
    } finally {
      setCoverLetterLoading(false);
    }
  };

  const fetchJobs = async () => {
    clearMessage();

    if (!requireLogin()) return;

    if (!jobSearchForm.search.trim()) {
      setMessage("Enter a role to search.");
      return;
    }

    setJobsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/search`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          search: jobSearchForm.search,
          location: jobSearchForm.location,
          remoteOnly: jobSearchForm.remoteOnly,
          country: jobSearchForm.country,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to search jobs.");
      }

      setJobResults(data.jobs || []);
      setMessage(`Found ${data.totalMatched ?? data.jobs?.length ?? 0} jobs.`);
    } catch (error) {
      setMessage(error.message || "Job search failed.");
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    if (!token) return;

    setSavedJobsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/stored`, {
        method: "GET",
        headers: authHeaders,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load saved jobs.");
      }

      setSavedJobs(data.jobs || []);
    } catch (error) {
      setMessage(error.message || "Failed to load saved jobs.");
    } finally {
      setSavedJobsLoading(false);
    }
  };

  const handleSaveJob = async (job) => {
    clearMessage();

    if (!requireLogin()) return;

    try {
      const res = await fetch(`${API_BASE}/api/jobs/save`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          jobId: job.jobId,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          jobUrl: job.jobUrl,
          source: job.source,
          country: job.country,
          remote: job.remote,
          matchScore: job.matchScore,
          score: job.score,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Job saved successfully.");
      } else {
        setMessage(data.message || "Job already saved.");
      }

      await fetchSavedJobs();
    } catch (error) {
      setMessage("Failed to save job.");
    }
  };

  const handleMarkApplied = async (jobId) => {
    clearMessage();

    if (!requireLogin()) return;

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/apply`, {
        method: "PATCH",
        headers: authHeaders,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to mark job as applied.");
      }

      setMessage("Job marked as applied.");
      await fetchSavedJobs();
    } catch (error) {
      setMessage(error.message || "Failed to mark job as applied.");
    }
  };

  const handleSkipJob = async (jobId) => {
    clearMessage();

    if (!requireLogin()) return;

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/skip`, {
        method: "PATCH",
        headers: authHeaders,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to skip job.");
      }

      setMessage("Job skipped successfully.");
      await fetchSavedJobs();
    } catch (error) {
      setMessage(error.message || "Failed to skip job.");
    }
  };

  const isJobSaved = (jobId) => {
    return savedJobs.some((job) => job.jobId === jobId);
  };

  if (loadingUser) {
    return (
      <div className="app-shell">
        <div className="auth-card">
          <h1>HireFlow AI</h1>
          <p>Loading account...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="app-shell">
        <div className="auth-card">
          <h1>HireFlow AI</h1>
          <p>
            Find jobs. Tailor your resume. Generate cover letters. Upgrade to
            move faster.
          </p>

          {message && <div className="message-box">{message}</div>}

          <div className="auth-switch">
            <button
              className={authMode === "login" ? "active-tab" : ""}
              onClick={() => {
                clearMessage();
                setAuthMode("login");
              }}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active-tab" : ""}
              onClick={() => {
                clearMessage();
                setAuthMode("register");
              }}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="tool-card">
              <h2>Welcome back</h2>

              <label>Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="you@example.com"
              />

              <label>Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter password"
              />

              <button type="submit" disabled={authLoading}>
                {authLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="tool-card">
              <h2>Create account</h2>

              <label>Name</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Your name"
              />

              <label>Email</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="you@example.com"
              />

              <label>Password</label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Create password"
              />

              <button type="submit" disabled={authLoading}>
                {authLoading ? "Creating account..." : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>HireFlow AI</h1>
          <p>
            Email: {user?.email || "Unknown"} | Plan: {user?.plan || "free"} |
            Status: {user?.subscriptionStatus || "inactive"}
          </p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      {message && <div className="message-box">{message}</div>}

      <div className="tab-bar">
        <button
          className={activeTab === "fix-errors" ? "active-tab" : ""}
          onClick={() => setActiveTab("fix-errors")}
        >
          Fix Errors
        </button>

        <button
          className={activeTab === "resume-tailor" ? "active-tab" : ""}
          onClick={() => setActiveTab("resume-tailor")}
        >
          Resume Tailor
        </button>

        <button
          className={activeTab === "cover-letter" ? "active-tab" : ""}
          onClick={() => setActiveTab("cover-letter")}
        >
          Cover Letter
        </button>

        <button
          className={activeTab === "jobs" ? "active-tab" : ""}
          onClick={() => setActiveTab("jobs")}
        >
          Jobs
        </button>
      </div>

      {activeTab === "fix-errors" && (
        <section className="tool-card">
          <h2>Fix Coding Errors from Text</h2>

          <form onSubmit={handleFixErrors}>
            <label>Error text</label>
            <textarea
              rows="10"
              value={fixErrorsForm.errorText}
              onChange={(e) =>
                setFixErrorsForm({
                  errorText: e.target.value,
                })
              }
              placeholder="Paste terminal error, stack trace, or screenshot text..."
            />

            <button type="submit" disabled={fixErrorsLoading}>
              {fixErrorsLoading ? "Analyzing..." : "Analyze Error"}
            </button>
          </form>

          {fixErrorsResult && (
            <div className="result-box">
              <h3>Result</h3>
              <pre>{fixErrorsResult}</pre>
            </div>
          )}
        </section>
      )}

      {activeTab === "resume-tailor" && (
        <section className="tool-card">
          <h2>Resume Tailor</h2>

          <div className="inline-actions">
            <button type="button" onClick={handleLoadSavedResumeForResumeTailor}>
              Load Saved Resume
            </button>
          </div>

          <form onSubmit={handleResumeTailor}>
            <label>Resume text</label>
            <textarea
              rows="10"
              value={resumeForm.resumeText}
              onChange={(e) =>
                setResumeForm((prev) => ({
                  ...prev,
                  resumeText: e.target.value,
                }))
              }
              placeholder="Paste your resume..."
            />

            <label>Job description</label>
            <textarea
              rows="10"
              value={resumeForm.jobDescription}
              onChange={(e) =>
                setResumeForm((prev) => ({
                  ...prev,
                  jobDescription: e.target.value,
                }))
              }
              placeholder="Paste job description..."
            />

            <button type="submit" disabled={resumeLoading}>
              {resumeLoading ? "Tailoring..." : "Tailor Resume"}
            </button>
          </form>

          {resumeResult && (
            <div className="result-box">
              <h3>Tailored Resume</h3>
              <pre>{resumeResult}</pre>
            </div>
          )}
        </section>
      )}

      {activeTab === "cover-letter" && (
        <section className="tool-card">
          <h2>Cover Letter</h2>

          <div className="inline-actions">
            <button type="button" onClick={handleLoadSavedResumeForCoverLetter}>
              Load Saved Resume
            </button>
          </div>

          <form onSubmit={handleCoverLetter}>
            <label>Resume text</label>
            <textarea
              rows="8"
              value={coverLetterForm.resumeText}
              onChange={(e) =>
                setCoverLetterForm((prev) => ({
                  ...prev,
                  resumeText: e.target.value,
                }))
              }
              placeholder="Paste your resume..."
            />

            <label>Job description</label>
            <textarea
              rows="8"
              value={coverLetterForm.jobDescription}
              onChange={(e) =>
                setCoverLetterForm((prev) => ({
                  ...prev,
                  jobDescription: e.target.value,
                }))
              }
              placeholder="Paste job description..."
            />

            <label>Company name</label>
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

            <label>Role title</label>
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

            <button type="submit" disabled={coverLetterLoading}>
              {coverLetterLoading ? "Generating..." : "Generate Cover Letter"}
            </button>
          </form>

          {coverLetterResult && (
            <div className="result-box">
              <h3>Cover Letter</h3>
              <pre>{coverLetterResult}</pre>
            </div>
          )}
        </section>
      )}

      {activeTab === "jobs" && (
        <section className="tool-card">
          <h2>Jobs</h2>

          <div className="jobs-grid">
            <div className="jobs-column">
              <h3>Search Jobs</h3>

              <label>Role</label>
              <input
                type="text"
                value={jobSearchForm.search}
                onChange={(e) =>
                  setJobSearchForm((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Node.js Developer"
              />

              <label>Location</label>
              <input
                type="text"
                value={jobSearchForm.location}
                onChange={(e) =>
                  setJobSearchForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="Optional"
              />

              <label>Country</label>
              <input
                type="text"
                value={jobSearchForm.country}
                onChange={(e) =>
                  setJobSearchForm((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
                placeholder="in"
              />

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={jobSearchForm.remoteOnly}
                  onChange={(e) =>
                    setJobSearchForm((prev) => ({
                      ...prev,
                      remoteOnly: e.target.checked,
                    }))
                  }
                />
                Remote only
              </label>

              <div className="inline-actions">
                <button type="button" onClick={fetchJobs} disabled={jobsLoading}>
                  {jobsLoading ? "Searching..." : "Search Jobs"}
                </button>
              </div>

              <div className="jobs-list">
                {jobResults.length === 0 ? (
                  <p>No search results yet.</p>
                ) : (
                  jobResults.map((job) => {
                    const saved = isJobSaved(job.jobId);

                    return (
                      <div className="job-card" key={job.jobId}>
                        <h4>{job.title}</h4>
                        <p>
                          <strong>Company:</strong> {job.company || "N/A"}
                        </p>
                        <p>
                          <strong>Location:</strong> {job.location || "N/A"}
                        </p>
                        <p>
                          <strong>Score:</strong> {job.score ?? 0}
                        </p>
                        <p>
                          <strong>Remote:</strong> {job.remote ? "Yes" : "No"}
                        </p>

                        <div className="inline-actions">
                          <button
                            type="button"
                            onClick={() => handleSaveJob(job)}
                            disabled={saved}
                          >
                            {saved ? "Saved" : "Save Job"}
                          </button>

                          {job.jobUrl ? (
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="link-button"
                            >
                              Open Job
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="jobs-column">
              <div className="jobs-saved-header">
                <h3>Saved Jobs</h3>
                <button
                  type="button"
                  onClick={fetchSavedJobs}
                  disabled={savedJobsLoading}
                >
                  {savedJobsLoading ? "Loading..." : "Refresh Saved Jobs"}
                </button>
              </div>

              <div className="jobs-list">
                {savedJobs.length === 0 ? (
                  <p>No saved jobs yet.</p>
                ) : (
                  savedJobs.map((job) => (
                    <div className="job-card" key={job._id}>
                      <h4>{job.title}</h4>
                      <p>
                        <strong>Company:</strong> {job.company || "N/A"}
                      </p>
                      <p>
                        <strong>Location:</strong> {job.location || "N/A"}
                      </p>
                      <p>
                        <strong>Score:</strong> {job.score ?? 0}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {job.applied
                          ? "Applied"
                          : job.skipped
                          ? "Skipped"
                          : "Saved"}
                      </p>

                      <div className="inline-actions">
                        <button
                          type="button"
                          onClick={() => handleMarkApplied(job._id)}
                          disabled={job.applied}
                        >
                          {job.applied ? "Applied" : "Mark Applied"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSkipJob(job._id)}
                          disabled={job.skipped}
                        >
                          {job.skipped ? "Skipped" : "Skip"}
                        </button>

                        {job.jobUrl ? (
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link-button"
                          >
                            Open Job
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
