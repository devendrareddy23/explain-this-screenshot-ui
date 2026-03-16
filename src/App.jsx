import { useMemo, useState } from "react";

function parseExplanationSections(text) {
  if (!text || typeof text !== "string") {
    return {
      problem: "",
      explanation: "",
      commands: [],
      solution: "",
      steps: [],
      raw: "",
    };
  }

  const extractSection = (label, nextLabels) => {
    const escapedNext = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n(?:${escapedNext.join("|")}):|$)`,
      "i"
    );
    const match = text.match(pattern);
    return match ? match[1].trim() : "";
  };

  const problem = extractSection("Problem", [
    "Explanation",
    "Commands to Run",
    "Solution",
    "Steps to Fix",
  ]);

  const explanation = extractSection("Explanation", [
    "Commands to Run",
    "Solution",
    "Steps to Fix",
  ]);

  const commandsText = extractSection("Commands to Run", [
    "Solution",
    "Steps to Fix",
  ]);

  const solution = extractSection("Solution", ["Steps to Fix"]);

  const stepsText = extractSection("Steps to Fix", []);

  const commands = commandsText
    ? commandsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const steps = stepsText
    ? stepsText
        .split("\n")
        .map((line) => line.replace(/^\s*\d+[\.\)]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return {
    problem,
    explanation,
    commands,
    solution,
    steps,
    raw: text,
  };
}

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "18px",
        borderRadius: "12px",
        border: "1px solid #1e293b",
        marginBottom: "14px",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "10px",
          fontSize: "18px",
          color: "#93c5fd",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [copyCommandsSuccess, setCopyCommandsSuccess] = useState("");

  const parsed = useMemo(() => parseExplanationSections(explanation), [explanation]);

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please upload an image file only.");
        setFile(null);
        setPreview("");
        setExplanation("");
        return;
      }

      setError("");
      setCopySuccess("");
      setCopyCommandsSuccess("");
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setExplanation("");
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a screenshot first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setExplanation("");
      setCopySuccess("");
      setCopyCommandsSuccess("");

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

      setExplanation(data.explanation || "No explanation received.");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyExplanation = async () => {
    if (!explanation) return;

    try {
      await navigator.clipboard.writeText(explanation);
      setCopySuccess("Full explanation copied!");
      setTimeout(() => {
        setCopySuccess("");
      }, 2000);
    } catch {
      setCopySuccess("Copy failed. Please copy manually.");
      setTimeout(() => {
        setCopySuccess("");
      }, 2000);
    }
  };

  const handleCopyCommands = async () => {
    if (!parsed.commands.length) return;

    try {
      await navigator.clipboard.writeText(parsed.commands.join("\n"));
      setCopyCommandsSuccess("Commands copied!");
      setTimeout(() => {
        setCopyCommandsSuccess("");
      }, 2000);
    } catch {
      setCopyCommandsSuccess("Copy failed. Please copy manually.");
      setTimeout(() => {
        setCopyCommandsSuccess("");
      }, 2000);
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
            marginBottom: "8px",
          }}
        >
          Upload a developer error screenshot and get a clear fix instantly.
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#cbd5e1",
            marginBottom: "35px",
          }}
        >
          Built for terminal errors, API issues, backend bugs, and deployment problems.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const droppedFile = e.dataTransfer.files[0];
            handleFile(droppedFile);
          }}
          style={{
            border: dragActive ? "2px dashed #38bdf8" : "2px dashed #475569",
            backgroundColor: dragActive ? "#1e293b" : "#111827",
            borderRadius: "16px",
            padding: "40px 20px",
            textAlign: "center",
            transition: "0.2s ease",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "18px",
              marginBottom: "15px",
            }}
          >
            Drag & drop your screenshot here
          </p>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "20px",
            }}
          >
            or
          </p>

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
            onChange={(e) => {
              const selectedFile = e.target.files[0];
              handleFile(selectedFile);
            }}
            style={{ display: "none" }}
          />

          {file && (
            <p
              style={{
                marginTop: "18px",
                color: "#cbd5e1",
              }}
            >
              Selected: {file.name}
            </p>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
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
            <h2
              style={{
                marginBottom: "15px",
              }}
            >
              Preview
            </h2>

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

        {explanation && (
          <div
            style={{
              backgroundColor: "#111827",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "18px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                AI Explanation
              </h2>

              <button
                onClick={handleCopyExplanation}
                style={{
                  backgroundColor: "#38bdf8",
                  color: "#0f172a",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Copy Full Explanation
              </button>
            </div>

            {copySuccess && (
              <div
                style={{
                  backgroundColor: "#052e16",
                  color: "#bbf7d0",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "14px",
                  fontSize: "14px",
                }}
              >
                {copySuccess}
              </div>
            )}

            {parsed.problem ? (
              <SectionCard title="Problem">
                <div style={{ lineHeight: "1.7", color: "#e5e7eb" }}>{parsed.problem}</div>
              </SectionCard>
            ) : null}

            {parsed.explanation ? (
              <SectionCard title="Explanation">
                <div style={{ lineHeight: "1.7", color: "#e5e7eb" }}>{parsed.explanation}</div>
              </SectionCard>
            ) : null}

            <SectionCard title="Commands to Run">
              <div
                style={{
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "16px",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  color: "#e2e8f0",
                  marginBottom: parsed.commands.length ? "12px" : "0",
                }}
              >
                {parsed.commands.length
                  ? parsed.commands.map((command) => `$ ${command}`).join("\n")
                  : "No exact command is appropriate for this issue."}
              </div>

              {parsed.commands.length ? (
                <button
                  onClick={handleCopyCommands}
                  style={{
                    backgroundColor: "#22c55e",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Copy Commands
                </button>
              ) : null}

              {copyCommandsSuccess ? (
                <div
                  style={{
                    backgroundColor: "#052e16",
                    color: "#bbf7d0",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginTop: "12px",
                    fontSize: "14px",
                  }}
                >
                  {copyCommandsSuccess}
                </div>
              ) : null}
            </SectionCard>

            {parsed.solution ? (
              <SectionCard title="Solution">
                <div style={{ lineHeight: "1.7", color: "#e5e7eb" }}>{parsed.solution}</div>
              </SectionCard>
            ) : null}

            <SectionCard title="Steps to Fix">
              {parsed.steps.length ? (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "20px",
                    lineHeight: "1.8",
                    color: "#e5e7eb",
                  }}
                >
                  {parsed.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              ) : (
                <div style={{ lineHeight: "1.7", color: "#e5e7eb" }}>
                  {parsed.raw || "No explanation received."}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
