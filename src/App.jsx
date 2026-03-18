import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const mockJobs = [
  {
    id: 1,
    company: "Clario",
    title: "Backend Engineer",
    location: "Remote",
    type: "Remote",
    score: 91,
    requiredExperience: 2,
    easyApply: true,
    blocker: false,
    applyLink: "https://example.com/job-1",
  },
  {
    id: 2,
    company: "TechNova",
    title: "Node.js Developer",
    location: "India",
    type: "Remote",
    score: 84,
    requiredExperience: 2,
    easyApply: true,
    blocker: false,
    applyLink: "https://example.com/job-2",
  },
  {
    id: 3,
    company: "ScaleOps",
    title: "Senior Backend Engineer",
    location: "Europe",
    type: "Remote",
    score: 87,
    requiredExperience: 6,
    easyApply: true,
    blocker: true,
    applyLink: "https://example.com/job-3",
  },
  {
    id: 4,
    company: "DataSpring",
    title: "Software Engineer - Backend",
    location: "Remote Worldwide",
    type: "Remote",
    score: 78,
    requiredExperience: 2,
    easyApply: true,
    blocker: false,
    applyLink: "https://example.com/job-4",
  },
  {
    id: 5,
    company: "NextLayer",
    title: "Backend Developer",
    location: "Bengaluru",
    type: "Onsite",
    score: 82,
    requiredExperience: 3,
    easyApply: false,
    blocker: false,
    applyLink: "https://example.com/job-5",
  },
  {
    id: 6,
    company: "OrbitStack",
    title: "Lead API Engineer",
    location: "Remote",
    type: "Remote",
    score: 89,
    requiredExperience: 7,
    easyApply: true,
    blocker: true,
    applyLink: "https://example.com/job-6",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("fix");

  const [selectedFile, setSelectedFile] = useState(null);
  const [errorText, setErrorText] = useState("");
  const [loadingFix, setLoadingFix] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [fixError, setFixError] = useState("");

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [loadingResume, setLoadingResume] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeError, setResumeError] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLinkedIn, setProfileLinkedIn] = useState("");
  const [profileGitHub, setProfileGitHub] = useState("");
  const [preferredRoles, setPreferredRoles] = useState("Backend Engineer, Node.js Developer");
  const [preferredLocations, setPreferredLocations] = useState("Remote, India, Europe");
  const [workMode, setWorkMode] = useState("Remote");
  const [minimumScore, setMinimumScore] = useState(80);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [easyApplyOnly, setEasyApplyOnly] = useState(true);
  const [runCheck, setRunCheck] = useState(false);

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
      setPreferredLocations(parsed.preferredLocations || "Remote, India, Europe");
      setWorkMode(parsed.workMode || "Remote");
      setMinimumScore(parsed.minimumScore || 80);
      setAutoApplyEnabled(
        parsed.autoApplyEnabled !== undefined ? parsed.autoApplyEnabled : true
      );
      setEasyApplyOnly(
        parsed.easyApplyOnly !== undefined ? parsed.easyApplyOnly : true
      );
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
      workMode,
      minimumScore,
      autoApplyEnabled,
      easyApplyOnly,
    };

    localStorage.setItem("autoApplyProfile", JSON.stringify(profile));
    alert("Auto apply settings saved.");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      alert("Copied successfully.");
    } catch {
      alert("Copy failed.");
    }
  };

  const handleAnalyzeFix = async (e) => {
    e.preventDefault();
    setLoadingFix(true);
    setFixError("");
    setFixResult(null);

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("screenshot", selectedFile);
      }

      if (errorText.trim()) {
        formData.append("errorText", errorText);
      }

      const response = await fetch(`${API_BASE_URL}/api/screenshots`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze screenshot.");
      }

      setFixResult(data);
    } catch (error) {
      setFixError(error.message || "Something went wrong.");
    } finally {
      setLoadingFix(false);
    }
  };

  const handleTailorResume = async (e) => {
    e.preventDefault();
    setLoadingResume(true);
    setResumeError("");
    setResumeResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume-tailor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          targetRole,
          locationPreference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to tailor resume.");
      }

      setResumeResult(data.result);
    } catch (error) {
      setResumeError(error.message || "Something went wrong.");
    } finally {
      setLoadingResume(false);
    }
  };

  const priorityClass = (priority) => {
    const value = (priority || "").toLowerCase();

    if (value.includes("high")) return "badge high";
    if (value.includes("apply")) return "badge apply";
    if (value.includes("maybe")) return "badge maybe";
    if (value.includes("skip")) return "badge skip";

    return "badge";
  };

  const classifiedJobs = useMemo(() => {
    if (!runCheck) {
      return {
        autoApplied: [],
        review: [],
        skipped: [],
      };
    }

    const roleList = preferredRoles
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const locationList = preferredLocations
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const autoApplied = [];
    const review = [];
    const skipped = [];

    mockJobs.forEach((job) => {
      const titleMatch =
        roleList.length === 0 ||
        roleList.some((role) => job.title.toLowerCase().includes(role));

      const locationMatch =
        locationList.length === 0 ||
        locationList.some(
          (location) =>
            job.location.toLowerCase().includes(location) ||
            job.type.toLowerCase().includes(location)
        );

      const workModeMatch =
        workMode === "Any" ||
        job.type.toLowerCase() === workMode.toLowerCase();

      const scoreMatch = job.score >= Number(minimumScore);
      const easyApplyMatch = easyApplyOnly ? job.easyApply : true;
      const blockerFree = !job.blocker;

      const jobWithReason = { ...job };

      if (!titleMatch || !locationMatch || !workModeMatch) {
        jobWithReason.status = "Skipped";
        jobWithReason.reason = "Does not match selected role, location, or work mode.";
        skipped.push(jobWithReason);
        return;
      }

      if (!blockerFree) {
        jobWithReason.status = "Skipped";
        jobWithReason.reason =
          "Qualification blocker detected (for example seniority mismatch).";
        skipped.push(jobWithReason);
        return;
      }

      if (autoApplyEnabled && scoreMatch && easyApplyMatch) {
        jobWithReason.status = "Auto Applied";
        jobWithReason.reason =
          "Original resume matched the job above the auto-apply threshold.";
        autoApplied.push(jobWithReason);
        return;
      }

      if (scoreMatch && !easyApplyMatch) {
        jobWithReason.status = "Saved for Review";
        jobWithReason.reason =
          "Strong match, but not easy apply. User should review manually.";
        review.push(jobWithReason);
        return;
      }

      if (!scoreMatch) {
        jobWithReason.status = "Saved for Review";
        jobWithReason.reason =
          "Below auto-apply threshold, saved for user review.";
        review.push(jobWithReason);
        return;
      }

      jobWithReason.status = "Saved for Review";
      jobWithReason.reason = "Needs manual review.";
      review.push(jobWithReason);
    });

    return {
      autoApplied,
      review,
      skipped,
    };
  }, [
    runCheck,
    preferredRoles,
    preferredLocations,
    workMode,
    minimumScore,
    autoApplyEnabled,
    easyApplyOnly,
  ]);

  const renderJobCard = (job, type) => (
    <div className="job-card" key={`${type}-${job.id}`}>
      <div className="job-card-top">
        <div>
          <h4>{job.title}</h4>
          <p className="job-company">
            {job.company} • {job.location} • {job.type}
          </p>
        </div>
        <div className="job-score">{job.score}%</div>
      </div>

      <div className="job-meta">
        <span className={`status-pill ${type}`}>{job.status}</span>
        <span className="meta-pill">Exp: {job.requiredExperience}+ yrs</span>
        <span className="meta-pill">
          {job.easyApply ? "Easy Apply" : "Manual Apply"}
        </span>
      </div>

      <p className="job-reason">{job.reason}</p>

      <div className="job-actions">
        <a href={job.applyLink} target="_blank" rel="noreferrer">
          Open Apply Link
        </a>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <h1>Developer Career Toolkit</h1>
      <p className="subtitle">
        Fix coding errors, match jobs faster, and prepare auto-apply workflows.
      </p>

      <div className="tab-buttons">
        <button
          className={activeTab === "fix" ? "active" : ""}
          onClick={() => setActiveTab("fix")}
        >
          Fix Errors
        </button>
        <button
          className={activeTab === "resume" ? "active" : ""}
          onClick={() => setActiveTab("resume")}
        >
          Job Match Dashboard
        </button>
        <button
          className={activeTab === "auto" ? "active" : ""}
          onClick={() => setActiveTab("auto")}
        >
          Auto Apply Settings
        </button>
      </div>

      {activeTab === "fix" && (
        <div className="tool-card">
          <h2>Fix Coding Errors from Screenshots Instantly</h2>

          <form onSubmit={handleAnalyzeFix}>
            <label>Upload Screenshot</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />

            <label>Or Paste Error Text</label>
            <textarea
              rows="6"
              placeholder="Paste your error here..."
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
            />

            <button type="submit" disabled={loadingFix}>
              {loadingFix ? "Analyzing..." : "Analyze Error"}
            </button>
          </form>

          {fixError && <p className="error-text">{fixError}</p>}

          {fixResult?.result && (
            <div className="result-card">
              <h3>AI Fix Result</h3>
              <pre>{fixResult.result}</pre>
              <button onClick={() => copyText(fixResult.result)}>Copy Fix</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "resume" && (
        <div className="tool-card">
          <h2>Job Match Dashboard</h2>

          <form onSubmit={handleTailorResume}>
            <label>Target Role</label>
            <input
              type="text"
              placeholder="Example: Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />

            <label>Location Preference</label>
            <input
              type="text"
              placeholder="Example: Remote worldwide / India / Europe"
              value={locationPreference}
              onChange={(e) => setLocationPreference(e.target.value)}
            />

            <label>Resume Text</label>
            <textarea
              rows="10"
              placeholder="Paste your full resume here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />

            <button type="button" onClick={handleSaveResume}>
              Save Resume
            </button>

            <label>Job Description</label>
            <textarea
              rows="10"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            <button type="submit" disabled={loadingResume}>
              {loadingResume ? "Evaluating..." : "Evaluate Job Match"}
            </button>
          </form>

          {resumeError && <p className="error-text">{resumeError}</p>}

          {resumeResult && (
            <div className="result-card">
              <h3>Job Match Report</h3>

              <div className="top-grid">
                <div className="metric-card">
                  <h4>Match Score</h4>
                  <p className="big-number">{resumeResult.matchScore || "N/A"}</p>
                </div>

                <div className="metric-card">
                  <h4>Priority</h4>
                  <span className={priorityClass(resumeResult.priority)}>
                    {resumeResult.priority || "N/A"}
                  </span>
                </div>
              </div>

              <div className="section">
                <h4>Decision</h4>
                <pre>{resumeResult.decision || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Suggested Job Title</h4>
                <pre>{resumeResult.suggestedJobTitle || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Professional Summary</h4>
                <pre>{resumeResult.professionalSummary || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Strengths</h4>
                <pre>{resumeResult.strengths || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Gaps</h4>
                <pre>{resumeResult.gaps || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Tailored Skills</h4>
                <pre>{resumeResult.tailoredSkills || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Tailored Experience</h4>
                <pre>{resumeResult.tailoredExperience || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>ATS Keywords Matched</h4>
                <pre>{resumeResult.atsKeywordsMatched || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Missing Keywords</h4>
                <pre>{resumeResult.missingKeywords || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Recommended Improvements</h4>
                <pre>{resumeResult.recommendedImprovements || "N/A"}</pre>
              </div>

              <div className="section">
                <h4>Cover Letter</h4>
                <pre>{resumeResult.coverLetter || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.coverLetter)}>
                  Copy Cover Letter
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "auto" && (
        <div className="tool-card">
          <h2>Auto Apply Settings Dashboard</h2>

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
            placeholder="Remote, India, Europe"
            value={preferredLocations}
            onChange={(e) => setPreferredLocations(e.target.value)}
          />

          <label>Work Mode</label>
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">Onsite</option>
            <option value="Any">Any</option>
          </select>

          <label>Minimum Auto Apply Score</label>
          <input
            type="number"
            min="1"
            max="100"
            value={minimumScore}
            onChange={(e) => setMinimumScore(e.target.value)}
          />

          <div className="toggle-row">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={(e) => setAutoApplyEnabled(e.target.checked)}
              />
              Enable Auto Apply
            </label>

            <label className="toggle-item">
              <input
                type="checkbox"
                checked={easyApplyOnly}
                onChange={(e) => setEasyApplyOnly(e.target.checked)}
              />
              Easy Apply Only
            </label>
          </div>

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
            <button type="button" onClick={() => setRunCheck(true)}>
              Run Auto Apply Check
            </button>
          </div>

          {runCheck && (
            <div className="result-card">
              <h3>Auto Apply Results</h3>

              <div className="summary-grid">
                <div className="metric-card">
                  <h4>Auto Applied</h4>
                  <p className="big-number">{classifiedJobs.autoApplied.length}</p>
                </div>
                <div className="metric-card">
                  <h4>Saved for Review</h4>
                  <p className="big-number">{classifiedJobs.review.length}</p>
                </div>
                <div className="metric-card">
                  <h4>Skipped</h4>
                  <p className="big-number">{classifiedJobs.skipped.length}</p>
                </div>
              </div>

              <div className="section">
                <h4>Auto Applied Jobs</h4>
                {classifiedJobs.autoApplied.length > 0 ? (
                  classifiedJobs.autoApplied.map((job) =>
                    renderJobCard(job, "auto")
                  )
                ) : (
                  <p>No jobs auto applied.</p>
                )}
              </div>

              <div className="section">
                <h4>Saved for Review</h4>
                {classifiedJobs.review.length > 0 ? (
                  classifiedJobs.review.map((job) =>
                    renderJobCard(job, "review")
                  )
                ) : (
                  <p>No jobs saved for review.</p>
                )}
              </div>

              <div className="section">
                <h4>Skipped Jobs</h4>
                {classifiedJobs.skipped.length > 0 ? (
                  classifiedJobs.skipped.map((job) =>
                    renderJobCard(job, "skip")
                  )
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
