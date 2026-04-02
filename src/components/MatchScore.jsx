function clampPercent(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeBreakdownPercent(score, maxScore) {
  const numericScore = Number(score || 0);
  const numericMax = Number(maxScore || 0);

  if (!Number.isFinite(numericScore) || !Number.isFinite(numericMax) || numericMax <= 0) {
    return 0;
  }

  return clampPercent(numericScore / numericMax * 100);
}

function getScoreMeta(score) {
  const numeric = Number(score || 0);

  if (numeric >= 8) {
    return { label: "Strong Match", tone: "strong" };
  }

  if (numeric >= 5) {
    return { label: "Good Match", tone: "good" };
  }

  return { label: "Weak Match", tone: "weak" };
}

function buildTooltip(breakdown) {
  if (!breakdown) {
    return "Skills Match: --%\nCulture Fit: --%\nLocation: --%\nSalary: --%";
  }

  const skills = normalizeBreakdownPercent(breakdown.skills?.score, 4);
  const experience = normalizeBreakdownPercent(breakdown.experience?.score, 2);
  const companySize = normalizeBreakdownPercent(breakdown.companySize?.score, 1);
  const cultureFit = clampPercent(companySize || experience);
  const location = normalizeBreakdownPercent(breakdown.location?.score, 2);
  const salary = normalizeBreakdownPercent(breakdown.salary?.score, 1);

  return [
    `Skills Match: ${skills}%`,
    `Culture Fit: ${cultureFit}%`,
    `Location: ${location}%`,
    `Salary: ${salary}%`,
  ].join("\n");
}

export default function MatchScore({ score = 0, breakdown = null, className = "" }) {
  const numericScore = Number(score || 0);
  const { label, tone } = getScoreMeta(numericScore);
  const tooltip = buildTooltip(breakdown);
  const classes = ["hf-match-score", `hf-match-score-${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} title={tooltip}>
      <span className="hf-match-score-value">{numericScore.toFixed(1)}/10</span>
      <span className="hf-match-score-label">{label}</span>
    </span>
  );
}
