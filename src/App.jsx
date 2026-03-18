import { useState } from "react";
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

  const handleAnalyze = async () => {
    if (!errorText.trim()) {
      alert("Paste error text.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("errorText", errorText);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) throw new Error("Failed");

      setResult(normalizeResult(data.result));
    } catch (err) {
      alert("Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Fix Coding Errors Instantly</h1>

        <textarea
          placeholder="Paste error..."
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
        />

        <button onClick={handleAnalyze}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {result && (
          <div className="result">
            <h2>⚡ Quick Fix</h2>
            <pre>{result.quickFix}</pre>

            <h2>💻 Commands</h2>
            <pre>{result.commandsToRun}</pre>

            <h2>🪜 Steps</h2>
            {result.steps.map((s, i) => (
              <div key={i}>{s}</div>
            ))}

            <h2>👉 Next Best Action</h2>
            <pre>{result.nextBestAction}</pre>

            <h2>🛡️ Prevent This</h2>
            <pre>{result.preventThis}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
