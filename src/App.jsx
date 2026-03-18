import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL =
  "https://explain-this-screenshot-api.onrender.com/api/screenshots";

function normalizeResult(input) {
  if (!input) return null;

  return {
    stack: input.stack || "",
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
  const [history, setHistory] = useState([]);

  const timerRef = useRef(null);

  useEffect(() => {
    const savedUsage = Number(localStorage.getItem("free_usage_count") || 0);
    setUsageCount(savedUsage);

    const savedHistory = JSON.parse(
      localStorage.getItem("fix_history") || "[]"
    );
    setHistory(Array.isArray(savedHistory) ? savedHistory : []);
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

  const buildFullFixText = (data) => {
    return [
      data.stack ? `Stack:\n${data.stack}` : "",
      data.problem ? `Problem:\n${data.problem}` : "",
      data.quickFix ? `Quick Fix:\n${data.quickFix}` : "",
      data.explanation ? `Why This Happened:\n${data.explanation}` : "",
      data.commandsToRun ? `Run This:\n${data.commandsToRun}` : "",
      data.codeFix ? `Code Fix:\n${data.codeFix}` : "",
      data.steps.length > 0 ? `Steps:\n${data.steps.join("\n")}` : "",
      data.nextBestAction ? `Next Best Action:\n${data.nextBestAction}` : "",
      data.preventThis ? `Prevent This:\n${data.preventThis}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const saveToHistory = (inputText, normalizedResult) => {
    const entry = {
      id: Date.now(),
      errorText: inputText,
      createdAt: new Date().toLocaleString(),
      result: normalizedResult,
    };

    const updatedHistory = [entry, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem("fix_history", JSON.stringify(updatedHistory));
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
      saveToHistory(trimmed, normalized);

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

  const clearHistory = () => {
    localStorage.removeItem("fix_history");
    setHistory([]);
    alert("History cleared");
  };

  const loadHistoryItem = (item) => {
    setErrorText(item.errorText);
    setResult(item.result);
  };

  const stackBadgeClass = (stack) => {
    const value = (stack || "").toLowerCase();

    if (value.includes("react")) return "stack-badge react";
    if (value.includes("node")) return "stack-badge node";
    if (value.includes("express")) return "stack-badge express";
    if (value.includes("mongo")) return "stack-badge mongo";
    if (value.includes("python")) return "stack-badge python";
    if (value.includes("sql")) return "stack-badge sql";
    if (value.includes("docker")) return "stack-badge docker";
    if (value.includes("git")) return "stack-badge git";

    return "stack-badge general";
  };

  return (
    <div className="app">
      <div className="container">
        <div className="hero">
          <h1>Fix Coding Errors Instantly</h1>
          <p className="subtitle">
            Paste your error and get a fast, developer-friendly fix with
            commands, next actions, prevention tips, and stack-aware guidance.
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
            {result.stack && (
              <section className="result-section stack-section">
                <div className="section-header">
                  <h2>Detected Stack</h2>
                  <button onClick={() => copyToClipboard(result.stack)}>
                    Copy
                  </button>
                </div>
                <div className={stackBadgeClass(result.stack)}>{result.stack}</div>
              </section>
            )}

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
                onClick={() => copyToClipboard(buildFullFixText(result))}
              >
                Copy Full Fix
              </button>
            </div>
          </div>
        )}

        <div className="history-section">
          <div className="history-header">
            <h2>Recent Fix History</h2>
            {history.length > 0 && (
              <button className="small-btn" onClick={clearHistory}>
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="history-empty">No previous fixes yet.</p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-card" key={item.id}>
                  <div className="history-top">
                    <strong>{item.result.problem || "Previous Fix"}</strong>
                    <span>{item.createdAt}</span>
                  </div>

                  {item.result.stack && (
                    <div className={stackBadgeClass(item.result.stack)}>
                      {item.result.stack}
                    </div>
                  )}

                  <p className="history-error">{item.errorText}</p>

                  <div className="history-actions">
                    <button
                      className="history-btn"
                      onClick={() => loadHistoryItem(item)}
                    >
                      Open Fix
                    </button>
                    <button
                      className="history-btn"
                      onClick={() => copyToClipboard(buildFullFixText(item.result))}
                    >
                      Copy Fix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                <li>Recent local history</li>
              </ul>
              <button className="pricing-btn">Start Free</button>
            </div>

            <div className="pricing-card pro">
              <h3>Pro</h3>
              <p className="price">$5/month</p>
              <ul>
                <li>Unlimited analyses</li>
                <li>Stack-aware fixes</li>
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
