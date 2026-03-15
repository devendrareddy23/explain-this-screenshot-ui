import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult("");
  };

  const analyzeScreenshot = async () => {
    if (!file) {
      alert("Upload screenshot first");
      return;
    }

    const formData = new FormData();
    formData.append("screenshot", file);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:8000/api/screenshots", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to analyze screenshot");
      }

      setResult(data.data.explanation);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error analyzing screenshot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>AI Screenshot Explainer</h1>

      <p>Upload a screenshot and AI will explain it.</p>

      <input type="file" accept="image/*" onChange={handleFile} />

      <br />
      <br />

      <button onClick={analyzeScreenshot} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Screenshot"}
      </button>

      <br />
      <br />

      {preview && (
        <img
          src={preview}
          alt="Preview"
          style={{ width: "400px", border: "1px solid #ccc" }}
        />
      )}

      <br />
      <br />

      {result && (
        <div>
          <h2>AI Explanation</h2>
          <p style={{ whiteSpace: "pre-line" }}>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App;
