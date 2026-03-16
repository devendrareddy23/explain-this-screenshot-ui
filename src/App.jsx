import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload an image file only.");
      setFile(null);
      setPreview("");
      setResult("");
      return;
    }

    setError("");
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult("");
  };

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0];
    handleFileSelect(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a screenshot first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult("");

      const formData = new FormData();
      formData.append("screenshot", file);

      const response = await fetch("/api/screenshots", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error("Backend returned invalid JSON response.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze screenshot");
      }

      setResult(data.explanation || "No explanation received.");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
            textAlign: "center",
          }}
        >
          AI Screenshot Explainer
        </h1>

        <p
          style={{
            textAlign: "center",
            fontSize: "18px",
            color: "#94a3b8",
            marginBottom: "35px",
          }}
        >
          Upload a screenshot and get an AI explanation instantly.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: dragging ? "2px dashed #38bdf8" : "2px dashed #475569",
            backgroundColor: dragging ? "#1e293b" : "#111827",
            borderRadius: "16px",
            padding: "40px 20px",
            textAlign: "center",
            transition: "0.2s ease",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "18px", marginBottom: "15px" }}>
            Drag & drop your screenshot here
          </p>
          <p style={{ color: "#94a3b8", marginBottom: "20px" }}>or</p>

          <label
            htmlFor="fileUpload"
            style={{
              display: "inline-block",
              backgroundColor: "#38bdf8",
              color: "#0f172a",
              padding: "12px 22px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Choose Screenshot
          </label>

          <input
            id="fileUpload"
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            style={{ display: "none" }}
          />

          {file && (
            <p style={{ marginTop: "18px", color: "#cbd5e1" }}>
              Selected: {file.name}
            </p>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#64748b" : "#22c55e",
              color: "#ffffff",
              border: "none",
              padding: "14px 28px",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Analyzing..." : "Analyze Screenshot"}
          </button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
              color: "#93c5fd",
              fontSize: "18px",
            }}
          >
            AI is analyzing your screenshot...
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "#7f1d1d",
              color: "#fecaca",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {preview && (
          <div
            style={{
              backgroundColor: "#111827",
              padding: "20px",
              borderRadius: "16px",
              marginBottom: "25px",
            }}
          >
            <h2 style={{ marginBottom: "15px" }}>Preview</h2>
            <img
              src={preview}
              alt="Screenshot preview"
              style={{
                maxWidth: "100%",
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
            />
          </div>
        )}

        {result && (
          <div
            style={{
              backgroundColor: "#111827",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
            }}
          >
            <h2 style={{ marginBottom: "18px" }}>AI Explanation</h2>
            <div
              style={{
                backgroundColor: "#0f172a",
                padding: "18px",
                borderRadius: "12px",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                color: "#e5e7eb",
              }}
            >
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
