import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";

function getMatchPercent(score = 0) {
  if (score <= 0) return 0;
  if (score >= 100) return 100;
  return Math.round(score);
}

function getRemoteFriendly(job) {
  const text = `${job?.title || ""} ${job?.description || ""} ${job?.location || ""}`.toLowerCase();

  return (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("wfh") ||
    text.includes("anywhere") ||
    (job?.location || "").toLowerCase().includes("india")
  );
}

function getScoreFromJob(job) {
  if (typeof job?.score === "number") return job.score;

  const notes = job?.notes || "";
  const match = notes.match(/score:(\d+)/i);
  if (match) return Number(match[1]);

  return 0;
}

function JobCard({ job, onMarkApplied, onSkip, showActions = false }) {
  const score = getScoreFromJob(job);
  const matchPercent = getMatchPercent(score);
  const remoteFriendly = getRemoteFriendly(job);
  const remoteDetected = Boolean(job?.remote);

  return (
    <div className="job-card">
      <div className="job-card-top">
        <div>
          <h4>{job?.title || "Untitled Role"}</h4>
          <p className="job-company">
            <strong>Company:</strong> {job?.company || "Unknown"}
          </p>
        </div>

        <div className="match-badge">{matchPercent}% Match</div>
      </div>

      <p>
        <strong>Location:</strong> {job?.location || "Not provided"}
      </p>

      <p>
        <strong>Remote detected:</strong> {remoteDetected ? "Yes" : "No"}
      </p>

      <p>
        <strong>Remote-friendly match:</strong> {remoteFriendly ? "Yes" : "No"}
      </p>

      <p>
        <strong>Score:</strong> {score}
      </p>

      {job?.applied !== undefined ? (
        <p>
          <strong>Applied:</strong> {job.applied ? "Yes" : "No"}
        </p>
      ) : null}

      {job?.reasons?.length > 0 ? (
        <div className="why-match-box">
          <strong>Why this matches:</strong>
          <ul className="why-match-list">
            {job.reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {job?.description ? (
        <p className="job-description">
          {job.description.slice(0, 260)}
          {job.description.length > 260 ? "..." : ""}
        </p>
      ) : null}

      {job?.applyUrl ? (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="job-link"
        >
          Open Job
        </a>
      ) : null}

      {showActions ? (
        <div className="job-actions">
          {!job?.applied ? (
            <button type="button" onClick={() => onMarkApplied(job._id)}>
              Mark Applied
            </button>
          ) : null}

          <button
            type="button"
            className="secondary-btn"
            onClick={() => onSkip(job._id)}
          >
            Skip
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function JobsTab({ token, user }) {
  const [search, setSearch] = useState("node developer");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("in");
  const [remoteOnly, setRemoteOnly] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [clearingSaved, setClearingSaved] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [jobs, setJobs] = useState([]);
  const [shortlistedJobs, setShortlistedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);

  const profileEmail = useMemo(() => {
    return user?.email || "devendrareddym23@gmail.com";
  }, [user]);

  async function loadSavedJobs(selectedCountry = country) {
    if (!token) return;

    try {
      setLoadingSaved(true);
      setError("");

      const data = await apiRequest(
        `/api/jobs/stored?country=${encodeURIComponent(selectedCountry)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSavedJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch (err) {
      setError(err.message || "Failed to load saved jobs.");
    } finally {
      setLoadingSaved(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!token) {
      setError("You are not logged in.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      setJobs([]);
      setShortlistedJobs([]);

      const payload = {
        search,
        location,
        country,
        remoteOnly,
        profileEmail,
      };

      const data = await apiRequest("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const nextJobs = Array.isArray(data?.jobs) ? data.jobs : [];
      const nextShortlisted = Array.isArray(data?.shortlistedJobs)
        ? data.shortlistedJobs
        : [];

      setJobs(nextJobs);
      setShortlistedJobs(nextShortlisted);

      setMessage(
        `Search finished. Found ${nextJobs.length} jobs. Shortlisted ${nextShortlisted.length}.`
      );

      await loadSavedJobs(country);
    } catch (err) {
      setError(err.message || "Failed to search jobs.");
    } finally {
      setLoading(false);
    }
  }

  async function markApplied(jobId) {
    try {
      setError("");
      setMessage("");

      await apiRequest(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Marked as applied.");
      await loadSavedJobs(country);
    } catch (err) {
      setError(err.message || "Failed to mark applied.");
    }
  }

  async function skipJob(jobId) {
    try {
      setError("");
      setMessage("");

      await apiRequest(`/api/jobs/${jobId}/skip`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Job skipped.");
      await loadSavedJobs(country);
    } catch (err) {
      setError(err.message || "Failed to skip job.");
    }
  }

  async function clearSavedJobs() {
    try {
      setClearingSaved(true);
      setError("");
      setMessage("");

      const jobsToClear = savedJobs.filter((job) => job?._id);

      for (const job of jobsToClear) {
        await apiRequest(`/api/jobs/${job._id}/skip`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setMessage("Saved jobs cleared from active view.");
      await loadSavedJobs(country);
    } catch (err) {
      setError(err.message || "Failed to clear saved jobs.");
    } finally {
      setClearingSaved(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadSavedJobs(country);
    }
  }, [token]);

  return (
    <div className="jobs-page">
      <div className="card">
        <h2>🔥 Top 5 Jobs Today</h2>

        {shortlistedJobs.length === 0 ? (
          <p>No top jobs yet. Run a search.</p>
        ) : (
          <div className="job-list">
            {shortlistedJobs.map((job) => (
              <JobCard
                key={job._id || job.jobId}
                job={job}
                onMarkApplied={markApplied}
                onSkip={skipJob}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Jobs</h2>
        <p>Search and manage Node.js/backend jobs.</p>

        <form className="jobs-form" onSubmit={handleSearch}>
          <div className="field">
            <label>Role</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="node developer"
            />
          </div>

          <div className="field">
            <label>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="field">
            <label>Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toLowerCase())}
              placeholder="in"
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Prefer remote / India-wide roles
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search Jobs"}
          </button>
        </form>

        {error ? <div className="error-box">{error}</div> : null}
        {message ? <div className="success-box">{message}</div> : null}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Search Results</h3>
        </div>

        {jobs.length === 0 ? (
          <p>No search results yet.</p>
        ) : (
          <div className="job-list">
            {jobs.map((job) => (
              <JobCard
                key={job._id || job.jobId}
                job={job}
                onMarkApplied={markApplied}
                onSkip={skipJob}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Saved Jobs</h3>

          <div className="header-actions">
            <button
              type="button"
              onClick={() => loadSavedJobs(country)}
              disabled={loadingSaved}
            >
              {loadingSaved ? "Refreshing..." : "Refresh Saved Jobs"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={clearSavedJobs}
              disabled={clearingSaved || savedJobs.length === 0}
            >
              {clearingSaved ? "Clearing..." : "Clear Saved View"}
            </button>
          </div>
        </div>

        {savedJobs.length === 0 ? (
          <p>No saved jobs yet.</p>
        ) : (
          <div className="job-list">
            {savedJobs.map((job) => (
              <JobCard
                key={job._id || job.jobId}
                job={job}
                onMarkApplied={markApplied}
                onSkip={skipJob}
                showActions
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
