import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [activeTab, setActiveTab] = useState("fix-errors");

  const [errorText, setErrorText] = useState("");
  const [fixResult, setFixResult] = useState("");
  const [fixLoading, setFixLoading] = useState(false);

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeResult, setResumeResult] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    const savedResume = localStorage.getItem("saved_resume_text");
    const savedFixHistory = localStorage.getItem("fix_history");

    if (savedResume) {
      setResumeText(savedResume);
    }

    if (!savedFixHistory) {
      localStorage.setItem("fix_history", JSON.stringify([]));
    }
  }, []);

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

  const handleAnalyzeError = async () => {
    if (!errorText.trim()) {
      alert("Paste an error first.");
      return;
    }

    try {
      setFixLoading(true);
      setFixResult("");

      const response = await fetch(`${API_BASE}/api/screenshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

    try {
      setResumeLoading(true);
      setResumeResult("");

      const response = await fetch(`${API_BASE}/api/resume-tailor`, {
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

  return (
    <div className="app-shell">
      <div className="hero-card">
        <p className="eyebrow">DEVELOPER CAREER TOOLKIT</p>
        <h1>Fix coding errors and tailor your resume fast.</h1>
        <p className="hero-text">
          One tool for debugging screenshots and pasted errors. One tool for
          matching your resume to a job description without rewriting everything
          manually.
        </p>

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

          <label className="label">Paste Error</label>
          <textarea
            className="textarea large"
            placeholder="Paste your error, stack trace, terminal issue, or screenshot-extracted text here..."
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
          />

          <div className="button-row">
            <button
              className="primary-btn"
              onClick={handleAnalyzeError}
              disabled={fixLoading}
            >
              {fixLoading ? "Analyzing..." : "Analyze Error"}
            </button>

            <button
              className="secondary-btn"
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
                <h3>AI Fix Result</h3>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(fixResult, "Fix copied")}
                >
                  Copy Fix
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
            Save your base resume once, paste a job description, and get a more
            targeted version plus recruiter-ready output.
          </p>

          <label className="label">Your Resume</label>
          <textarea
            className="textarea xl"
            placeholder="Paste your full resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />

          <div className="button-row">
            <button className="secondary-btn" onClick={handleSaveResume}>
              Save Resume
            </button>

            <button className="secondary-btn" onClick={handleClearResume}>
              Clear Saved Resume
            </button>
          </div>

          <label className="label">Job Description</label>
          <textarea
            className="textarea xl"
            placeholder="Paste the target job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />

          <div className="button-row">
            <button
              className="primary-btn"
              onClick={handleTailorResume}
              disabled={resumeLoading}
            >
              {resumeLoading ? "Tailoring..." : "Tailor Resume"}
            </button>

            <button
              className="secondary-btn"
              onClick={() => {
                setJobDescription("");
                setResumeResult("");
              }}
            >
              Clear JD
            </button>
          </div>

          {resumeResult && (
            <div className="result-card">
              <div className="result-header">
                <h3>Tailored Resume Result</h3>
                <button
                  className="copy-btn"
                  onClick={() =>
                    handleCopy(resumeResult, "Resume result copied")
                  }
                >
                  Copy Result
                </button>
              </div>

              <div className="resume-sections">
                {parsedResumeSections.map((section, index) => (
                  <div className="resume-section" key={`${section.title}-${index}`}>
                    <div className="resume-section-header">
                      <h4>{section.title}</h4>
                      <button
                        className="copy-btn small"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
