import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = "https://explain-this-screenshot-api.onrender.com/api/screenshots";

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult("");
  };

  const analyzeScreenshot = async () => {
    if (!file) {
      alert("Upload a screenshot first");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("screenshot", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed");
      }

      setResult(data.explanation);
    } catch (error) {
      console.error(error);
      alert("Error analyzing screenshot");
    }

    setLoading(false);
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

      {loading && <p>Analyzing screenshot...</p>}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h2>AI Explanation</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}
