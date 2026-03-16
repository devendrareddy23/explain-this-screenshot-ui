import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "/api/screenshots";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("debug-history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (newItem) => {
    const updatedHistory = [newItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem("debug-history", JSON.stringify(updatedHistory));
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Copy failed");
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handleAnalyze = async (passedErrorText = errorText, passedFile = selectedFile) => {
    if (!passedFile && !passedErrorText.trim()) {
      alert("Upload a screenshot or paste error text.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (passedFile) {
        formData.append("screenshot", passedFile);
      }

      if (passedErrorText.trim()) {
        formData.append("errorText", passedErrorText.trim());
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong");
      }

      setResult(data.result);

      saveToHistory({
        id: Date.now(),
        fileName: passedFile ? passedFile.name : "Pasted Error Text",
        createdAt: new Date().toLocaleString(),
        result: data.result,
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to analyze.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData("text");
    setErrorText(pastedText);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Fix Coding Errors from Screenshots Instantly</h1>
        <p className="subtitle">
          Upload a screenshot or paste your error text. Get a fast developer-friendly fix.
        </p>

        <div
          className={`dropzone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <p>Drag and drop screenshot here</p>
          <p>or</p>
          <label className="upload-btn">
            Choose Screenshot
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </label>

          {selectedFile && (
            <div className="selected-file">
              Selected: <strong>{selectedFile.name}</strong>
            </div>
          )}
        </div>

        <textarea
          className="error-input"
          placeholder="Paste your error text here..."
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          onPaste={handlePaste}
          rows={8}
        />

        <button className="analyze-btn" onClick={() => handleAnalyze()} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Error"}
        </button>

        {result && (
          <div className="result-card">
            {result.problem && (
              <section>
                <div className="section-header">
                  <h2>Problem</h2>
                  <button onClick={() => copyToClipboard(result.problem)}>Copy</button>
                </div>
                <pre>{result.problem}</pre>
              </section>
            )}

            {result.quickFix && (
              <section className="quick-fix-box">
                <div className="section-header">
                  <h2>⚡ Quick Fix</h2>
                  <button onClick={() => copyToClipboard(result.quickFix)}>Copy</button>
                </div>
                <pre>{result.quickFix}</pre>
              </section>
            )}

            {result.explanation && (
              <section>
                <div className="section-header">
                  <h2>Explanation</h2>
                  <button onClick={() => copyToClipboard(result.explanation)}>Copy</button>
                </div>
                <pre>{result.explanation}</pre>
              </section>
            )}

            {result.commandsToRun && (
              <section>
                <div className="section-header">
                  <h2>Commands to Run</h2>
                  <button onClick={() => copyToClipboard(result.commandsToRun)}>Copy</button>
                </div>
                <pre>{result.commandsToRun}</pre>
              </section>
            )}

            {result.codeFix && (
              <section>
                <div className="section-header">
                  <h2>Code Fix</h2>
                  <button onClick={() => copyToClipboard(result.codeFix)}>Copy</button>
                </div>
                <pre>{result.codeFix}</pre>
              </section>
            )}

            {result.steps?.length > 0 && (
              <section>
                <div className="section-header">
                  <h2>Steps</h2>
                  <button onClick={() => copyToClipboard(result.steps.join("\n"))}>Copy</button>
                </div>
                <ol>
                  {result.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="history-card">
            <h2>Recent History</h2>
            {history.map((item) => (
              <div className="history-item" key={item.id}>
                <div>
                  <strong>{item.fileName}</strong>
                  <p>{item.createdAt}</p>
                </div>
                <button onClick={() => setResult(item.result)}>Load</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
