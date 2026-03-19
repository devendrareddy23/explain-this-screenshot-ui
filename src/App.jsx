import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function App() {
  const [activeTab, setActiveTab] = useState("auto");

  const [resumeText, setResumeText] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLinkedIn, setProfileLinkedIn] = useState("");
  const [profileGitHub, setProfileGitHub] = useState("");
  const [preferredRoles, setPreferredRoles] = useState("Backend Engineer, Node.js Developer");
  const [preferredLocations, setPreferredLocations] = useState("Remote, Worldwide, India, Europe");
  const [minimumScore, setMinimumScore] = useState(80);

  const [searchTerm, setSearchTerm] = useState("backend engineer node.js");
  const [jobLimit, setJobLimit] = useState(12);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState("");
  const [jobResult, setJobResult] = useState(null);

  useEffect(() => {
    const savedResume = localStorage.getItem("savedResumeText");
    const savedProfile = localStorage.getItem("autoApplyProfile");

    if (savedResume) {
      setResumeText(savedResume);
    }

    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfileName(parsed.profileName || "");
      setProfileEmail(parsed.profileEmail || "");
      setProfilePhone(parsed.profilePhone || "");
      setProfileLinkedIn(parsed.profileLinkedIn || "");
      setProfileGitHub(parsed.profileGitHub || "");
      setPreferredRoles(parsed.preferredRoles || "Backend Engineer, Node.js Developer");
      setPreferredLocations(parsed.preferredLocations || "Remote, Worldwide, India, Europe");
      setMinimumScore(parsed.minimumScore || 80);
    }
  }, []);

  const handleSaveResume = () => {
    localStorage.setItem("savedResumeText", resumeText);
    alert("Resume saved successfully.");
  };

  const handleSaveProfile = () => {
    const profile = {
      profileName,
      profileEmail,
      profilePhone,
      profileLinkedIn,
      profileGitHub,
      preferredRoles,
      preferredLocations,
      minimumScore,
    };

    localStorage.setItem("autoApplyProfile", JSON.stringify(profile));
    alert("Auto apply settings saved.");
  };

  const handleFindRealJobs = async () => {
    setLoadingJobs(true);
    setJobError("");
    setJobResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search: searchTerm,
          limit: Number(jobLimit),
          category: "software-dev",
          preferredRoles,
          preferredLocations,
          minimumScore: Number(minimumScore),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch real jobs.");
      }

      setJobResult(data.result);
    } catch (error) {
      setJobError(error.message || "Something went wrong.");
    } finally {
      setLoadingJobs(false);
    }
  };

  const renderJobCard = (job, type) => (
    <div className="job-card" key={`${type}-${job.id}`}>
      <div className="job-card-top">
        <div>
          <h4>{job.title}</h4>
          <p className="job-company">
            {job.company} • {job.location}
          </p>
          <p className="job-source">
            Source: {job.source} • {job.type} • {job.salary}
          </p>
        </div>
        <div className="job-score">{job.score}%</div>
      </div>

      <div className="job-meta">
        <span className={`status-pill ${type}`}>{job.status}</span>
        <span className="meta-pill">{job.category || "General"}</span>
      </div>

      <p className="job-reason">{job.reason}</p>
      <p className="job-description">{job.descriptionSnippet}</p>

      <div className="job-actions">
        <a href={job.url} target="_blank" rel="noreferrer">
          Open Apply Link
        </a>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <h1>Developer Career Toolkit</h1>
      <p className="subtitle">
        Find real matching jobs and auto-bucket them using your original resume.
      </p>

      <div className="tab-buttons">
        <button
          className={activeTab === "auto" ? "active" : ""}
          onClick={() => setActiveTab("auto")}
        >
          Real Job Finder
        </button>
      </div>

      {activeTab === "auto" && (
        <div className="tool-card">
          <h2>Real Job Finder</h2>

          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter full name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />

          <label>Email</label>
          <input
            type="text"
            placeholder="Enter email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
          />

          <label>Phone</label>
          <input
            type="text"
            placeholder="Enter phone"
            value={profilePhone}
            onChange={(e) => setProfilePhone(e.target.value)}
          />

          <label>LinkedIn URL</label>
          <input
            type="text"
            placeholder="Enter LinkedIn URL"
            value={profileLinkedIn}
            onChange={(e) => setProfileLinkedIn(e.target.value)}
          />

          <label>GitHub URL</label>
          <input
            type="text"
            placeholder="Enter GitHub URL"
            value={profileGitHub}
            onChange={(e) => setProfileGitHub(e.target.value)}
          />

          <label>Preferred Roles (comma separated)</label>
          <input
            type="text"
            placeholder="Backend Engineer, Node.js Developer"
            value={preferredRoles}
            onChange={(e) => setPreferredRoles(e.target.value)}
          />

          <label>Preferred Locations (comma separated)</label>
          <input
            type="text"
            placeholder="Remote, Worldwide, India, Europe"
            value={preferredLocations}
            onChange={(e) => setPreferredLocations(e.target.value)}
          />

          <label>Minimum Auto Apply Score</label>
          <input
            type="number"
            min="1"
            max="100"
            value={minimumScore}
            onChange={(e) => setMinimumScore(e.target.value)}
          />

          <label>Saved Resume Text</label>
          <textarea
            rows="8"
            placeholder="Paste your original resume here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />

          <div className="actions-row">
            <button type="button" onClick={handleSaveResume}>
              Save Resume
            </button>
            <button type="button" onClick={handleSaveProfile}>
              Save Settings
            </button>
          </div>

          <hr className="divider" />

          <label>Search Query</label>
          <input
            type="text"
            placeholder="backend engineer node.js"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <label>How Many Jobs</label>
          <input
            type="number"
            min="1"
            max="30"
            value={jobLimit}
            onChange={(e) => setJobLimit(e.target.value)}
          />

          <button type="button" onClick={handleFindRealJobs} disabled={loadingJobs}>
            {loadingJobs ? "Finding Real Jobs..." : "Find Real Jobs"}
          </button>

          {jobError && <p className="error-text">{jobError}</p>}

          {jobResult && (
            <div className="result-card">
              <h3>Real Job Results</h3>

              <div className="summary-grid">
                <div className="metric-card">
                  <h4>Total Jobs</h4>
                  <p className="big-number">{jobResult.total}</p>
                </div>
                <div className="metric-card">
                  <h4>Auto Applied</h4>
                  <p className="big-number">{jobResult.autoApplied.length}</p>
                </div>
                <div className="metric-card">
                  <h4>Saved for Review</h4>
                  <p className="big-number">{jobResult.review.length}</p>
                </div>
              </div>

              <div className="section">
                <h4>Auto Applied Jobs</h4>
                {jobResult.autoApplied.length > 0 ? (
                  jobResult.autoApplied.map((job) => renderJobCard(job, "auto"))
                ) : (
                  <p>No jobs auto bucketed yet.</p>
                )}
              </div>

              <div className="section">
                <h4>Saved for Review</h4>
                {jobResult.review.length > 0 ? (
                  jobResult.review.map((job) => renderJobCard(job, "review"))
                ) : (
                  <p>No jobs saved for review.</p>
                )}
              </div>

              <div className="section">
                <h4>Skipped Jobs</h4>
                {jobResult.skipped.length > 0 ? (
                  jobResult.skipped.map((job) => renderJobCard(job, "skip"))
                ) : (
                  <p>No jobs skipped.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
