import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL =
  "https://explain-this-screenshot-api.onrender.com/api/screenshots";

function normalizeResult(input) {
  if (!input) return null;

  return {
    problem: input.problem || "",
    quickFix: input.quickFix || "",
    explanation: input.explanation || input.raw || "",
    commandsToRun: input.commandsToRun || "",
    codeFix: input.codeFix || "",
    steps: Array.isArray(input.steps) ? input.steps : [],
    nextBestAction: input.nextBestAction || "",
    preventThis: input.preventThis || "",
  };
}

function App() {
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const savedUsage = Number(localStorage.getItem("free_usage_count") || 0);
    setUsageCount(savedUsage);
  }, []);

  const copyToClipboard = async (text) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      alert("Copied");
    } catch (error) {
      alert("Copy failed");
    }
  };

  const handleAnalyze = async (textToAnalyze = errorText) => {
    const trimmed = textToAnalyze.trim();

    if (!trimmed) {
      return;
    }

    const currentUsage = Number(localStorage.getItem("free_usage_count") || 0);

    if (currentUsage >= 3) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("errorText", trimmed);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to analyze");
      }

      const normalized = normalizeResult(data.result);
      setResult(normalized);

      const newUsage = currentUsage + 1;
      localStorage.setItem("free_usage_count", String(newUsage));
      setUsageCount(newUsage);

      if (newUsage >= 3) {
        setShowUpgrade(true);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setErrorText(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!value.trim()) {
      setResult(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      handleAnalyze(value);
    }, 1200);
  };

  const resetFreeUsage = () => {
    localStorage.setItem("free_usage_count", "0");
    setUsageCount(0);
    setShowUpgrade(false);
    alert("Free usage reset locally for testing.");
  };

  return (
    <div className="app">
      <div className="container">
        <div className="hero">
          <h1>Fix Coding Errors Instantly</h1>
          <p className="subtitle">
            Paste your error and get a fast, developer-friendly fix with
            commands, next actions, and prevention tips.
          </p>
          <p className="time-save">Save 30–60 minutes per bug.</p>
        </div>

        <div className="usage-bar">
          <span>Free analyses used: {usageCount}/3</span>
          <button className="small-btn" onClick={resetFreeUsage}>
            Reset Test Limit
          </button>
        </div>

        <textarea
          className="error-input"
          placeholder="Paste your error here... Auto-analyzes after 1.2 seconds."
          value={errorText}
          onChange={handleTextareaChange}
          rows={8}
        />

        <button
          className="analyze-btn"
          onClick={() => handleAnalyze()}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze Now"}
        </button>

        {showUpgrade && (
          <div className="upgrade-banner">
            <h3>Upgrade to Pro — $5/month</h3>
            <p>
              Unlimited fixes, faster debugging, and a smoother workflow for
              daily work.
            </p>
            <button
              className="upgrade-btn"
              onClick={() =>
                (window.location.href =
                  "mailto:devendrareddym23@gmail.com?subject=Upgrade to Pro - $5/month")
              }
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {result && (
          <div className="result">
            {result.problem && (
              <section className="result-section">
                <div className="section-header">
                  <h2>Problem</h2>
                  <button onClick={() => copyToClipboard(result.problem)}>
                    Copy
                  </button>
                </div>
                <pre>{result.problem}</pre>
              </section>
            )}

            {result.quickFix && (
              <section className="result-section quick-fix">
                <div className="section-header">
                  <h2>⚡ Quick Fix</h2>
                  <button onClick={() => copyToClipboard(result.quickFix)}>
                    Copy
                  </button>
                </div>
                <pre>{result.quickFix}</pre>
              </section>
            )}

            {result.explanation && (
              <section className="result-section">
                <div className="section-header">
                  <h2>Why This Happened</h2>
                  <button onClick={() => copyToClipboard(result.explanation)}>
                    Copy
                  </button>
                </div>
                <pre>{result.explanation}</pre>
              </section>
            )}

            {result.commandsToRun && (
              <section className="result-section">
                <div className="section-header">
                  <h2>💻 Run This</h2>
                  <button
                    onClick={() => copyToClipboard(result.commandsToRun)}
                  >
                    Copy
                  </button>
                </div>
                <pre>{result.commandsToRun}</pre>
              </section>
            )}

            {result.codeFix && (
              <section className="result-section">
                <div className="section-header">
                  <h2>Code Fix</h2>
                  <button onClick={() => copyToClipboard(result.codeFix)}>
                    Copy
                  </button>
                </div>
                <pre>{result.codeFix}</pre>
              </section>
            )}

            {result.steps.length > 0 && (
              <section className="result-section">
                <div className="section-header">
                  <h2>🪜 Steps</h2>
                  <button
                    onClick={() => copyToClipboard(result.steps.join("\n"))}
                  >
                    Copy
                  </button>
                </div>
                <ol className="steps-list">
                  {result.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </section>
            )}

            {result.nextBestAction && (
              <section className="result-section">
                <div className="section-header">
                  <h2>👉 Next Best Action</h2>
                  <button
                    onClick={() => copyToClipboard(result.nextBestAction)}
                  >
                    Copy
                  </button>
                </div>
                <pre>{result.nextBestAction}</pre>
              </section>
            )}

            {result.preventThis && (
              <section className="result-section">
                <div className="section-header">
                  <h2>🛡️ Prevent This</h2>
                  <button onClick={() => copyToClipboard(result.preventThis)}>
                    Copy
                  </button>
                </div>
                <pre>{result.preventThis}</pre>
              </section>
            )}

            <div className="copy-all-wrap">
              <button
                className="copy-all-btn"
                onClick={() =>
                  copyToClipboard(
                    [
                      result.problem ? `Problem:\n${result.problem}` : "",
                      result.quickFix ? `Quick Fix:\n${result.quickFix}` : "",
                      result.explanation
                        ? `Why This Happened:\n${result.explanation}`
                        : "",
                      result.commandsToRun
                        ? `Run This:\n${result.commandsToRun}`
                        : "",
                      result.codeFix ? `Code Fix:\n${result.codeFix}` : "",
                      result.steps.length > 0
                        ? `Steps:\n${result.steps.join("\n")}`
                        : "",
                      result.nextBestAction
                        ? `Next Best Action:\n${result.nextBestAction}`
                        : "",
                      result.preventThis
                        ? `Prevent This:\n${result.preventThis}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join("\n\n")
                  )
                }
              >
                Copy Full Fix
              </button>
            </div>
          </div>
        )}

        <div className="pricing-section">
          <h2>Pricing</h2>
          <p className="pricing-subtitle">
            Start free. Upgrade when you need more.
          </p>

          <div className="pricing-cards">
            <div className="pricing-card">
              <h3>Free</h3>
              <p className="price">$0</p>
              <ul>
                <li>3 analyses</li>
                <li>Quick fixes</li>
                <li>Basic debugging help</li>
              </ul>
              <button className="pricing-btn">Start Free</button>
            </div>

            <div className="pricing-card pro">
              <h3>Pro</h3>
              <p className="price">$5/month</p>
              <ul>
                <li>Unlimited analyses</li>
                <li>Faster debugging workflow</li>
                <li>Commands + prevention tips</li>
                <li>Priority future features</li>
              </ul>
              <button
                className="pricing-btn pro-btn"
                onClick={() =>
                  (window.location.href =
                    "mailto:devendrareddym23@gmail.com?subject=Upgrade to Pro - $5/month")
                }
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
