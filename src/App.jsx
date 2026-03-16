import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = "https://explain-this-screenshot-api.onrender.com";

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult("");
    setError("");
  };

  const analyzeScreenshot = async () => {
    if (!file) {
      setError("Please upload a screenshot first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("screenshot", file);   // IMPORTANT: backend expects "screenshot"

      const response = await fetch(
        `${API_URL}/api/screenshots`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze screenshot");
      }

      setResult(data.explanation || JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError("Load failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "Arial" }}>
      <h1>AI Screenshot Explainer</h1>
      <p>Upload a screenshot and AI will explain it.</p>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: "20px" }}>
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: "100%", borderRadius: "10px" }}
          />
        </div>
      )}

      <button
        onClick={analyzeScreenshot}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Analyze Screenshot
      </button>

      {loading && <p style={{ marginTop: "20px" }}>Analyzing screenshot...</p>}

      {error && (
        <p style={{ marginTop: "20px", color: "red" }}>
          Error: {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h2>AI Explanation</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App;
