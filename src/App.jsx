import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function App() {
  const [activeTab, setActiveTab] = useState("fix");

  const [selectedFile, setSelectedFile] = useState(null);
  const [errorText, setErrorText] = useState("");
  const [loadingFix, setLoadingFix] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [fixError, setFixError] = useState("");

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loadingResume, setLoadingResume] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    const savedResume = localStorage.getItem("savedResumeText");
    if (savedResume) {
      setResumeText(savedResume);
    }
  }, []);

  const handleSaveResume = () => {
    localStorage.setItem("savedResumeText", resumeText);
    alert("Resume saved successfully.");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      alert("Copied successfully.");
    } catch (error) {
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

  return (
    <div className="app-container">
      <h1>Developer Career Toolkit</h1>
      <p className="subtitle">
        Fix coding errors and tailor your resume for every job in minutes.
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
          Resume Tailor
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
          <h2>Tailor Resume for Job Description</h2>

          <form onSubmit={handleTailorResume}>
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
              {loadingResume ? "Tailoring..." : "Tailor Resume"}
            </button>
          </form>

          {resumeError && <p className="error-text">{resumeError}</p>}

          {resumeResult && (
            <div className="result-card">
              <h3>ATS Match Report</h3>

              <div className="section">
                <h4>Match Score</h4>
                <p>{resumeResult.matchScore || "N/A"}</p>
              </div>

              <div className="section">
                <h4>Suggested Job Title</h4>
                <p>{resumeResult.suggestedJobTitle || "N/A"}</p>
              </div>

              <div className="section">
                <h4>Professional Summary</h4>
                <pre>{resumeResult.professionalSummary || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.professionalSummary)}>
                  Copy Summary
                </button>
              </div>

              <div className="section">
                <h4>Tailored Skills</h4>
                <pre>{resumeResult.tailoredSkills || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.tailoredSkills)}>
                  Copy Skills
                </button>
              </div>

              <div className="section">
                <h4>Tailored Experience</h4>
                <pre>{resumeResult.tailoredExperience || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.tailoredExperience)}>
                  Copy Experience
                </button>
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
                <h4>Cover Letter</h4>
                <pre>{resumeResult.coverLetter || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.coverLetter)}>
                  Copy Cover Letter
                </button>
              </div>

              <div className="section">
                <h4>Full Raw Output</h4>
                <pre>{resumeResult.rawText || "N/A"}</pre>
                <button onClick={() => copyText(resumeResult.rawText)}>
                  Copy Full Output
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
