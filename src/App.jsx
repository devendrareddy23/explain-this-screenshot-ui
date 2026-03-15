import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setExplanation("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      setLoading(true);
      setError("");
      setExplanation("");

      const res = await fetch(`${API_URL}/api/screenshots`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze screenshot.");
      }

      setExplanation(
        data.explanation || data.result || "No explanation returned."
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>AI Screenshot Explainer</h1>
        <p>Upload a screenshot and AI will explain it.</p>

        <form onSubmit={handleSubmit} className="upload-form">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Screenshot"}
          </button>
        </form>

        {error && (
          <div className="error-box">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {preview && (
          <div className="preview-box">
            <h2>Preview</h2>
            <img src={preview} alt="Screenshot preview" className="preview-image" />
          </div>
        )}

        {explanation && (
          <div className="result-box">
            <h2>AI Explanation</h2>
            <p>{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
