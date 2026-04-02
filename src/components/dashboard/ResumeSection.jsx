export default function ResumeSection({
  ControlCenterSection,
  resumeSectionSummary,
  activeControlSection,
  goToDashboardTab,
  resumeVaultText,
  applicationAnalytics,
  setResumeVaultText,
  handleSaveResumeVault,
  resumeVaultSaving,
  resumeVaultLoading,
  handleDeleteResumeVault,
  resumeVaultError,
  resumeVaultMessage,
  tailoredResumeJobs,
}) {
  const Section = ControlCenterSection;

  return (
    <Section
      title="Resume Vault"
      subtitle="Save your master resume and review tailored versions in one place."
      summary={resumeSectionSummary}
      open={activeControlSection === "resume"}
      onToggle={() => goToDashboardTab(activeControlSection === "resume" ? "home" : "resume")}
      actionLabel={resumeVaultText ? "Replace Resume" : "Save Resume"}
      onAction={() => goToDashboardTab("resume")}
    >
      <div className="hf-command-tabpanel">
        <div className="hf-panel-header">
          <h3>Resume</h3>
          <p>Manage your master resume and review tailored versions generated for specific roles.</p>
        </div>

        {applicationAnalytics?.message ? (
          <div className="hf-winner-banner">
            <span className="hf-chip hf-chip-green">Auto-Optimizing</span>
            <strong>{applicationAnalytics.message}</strong>
          </div>
        ) : (
          <div className="hf-winner-banner">
            <span className="hf-chip hf-chip-blue">Experiment Running</span>
            <strong>
              HireFlow is testing Versions A, B, and C across applications and will lock a winner after 20 tracked sends.
            </strong>
          </div>
        )}

        <div className="hf-command-grid">
          <div className="hf-panel hf-panel-nested">
            <div className="hf-field-block">
              <label className="hf-label">Master Resume</label>
              <textarea
                className="hf-textarea"
                value={resumeVaultText}
                onChange={(e) => setResumeVaultText(e.target.value)}
                placeholder="Save your master resume here"
              />
            </div>
            <div className="hf-panel-actions">
              <button className="hf-btn hf-btn-primary" onClick={handleSaveResumeVault} disabled={resumeVaultSaving || resumeVaultLoading}>
                {resumeVaultSaving ? "Saving..." : "Save Master Resume"}
              </button>
              <button className="hf-btn hf-btn-ghost" onClick={handleDeleteResumeVault} disabled={resumeVaultSaving || !resumeVaultText}>
                Delete Resume
              </button>
            </div>
            {resumeVaultError ? <p className="hf-error">{resumeVaultError}</p> : null}
            {resumeVaultMessage ? <p className="hf-success">{resumeVaultMessage}</p> : null}
          </div>

          <div className="hf-panel hf-panel-nested">
            <div className="hf-panel-header">
              <h3>Tailored Versions History</h3>
              <p>Recent resumes prepared for high-match jobs.</p>
            </div>
            <div className="hf-history-list">
              {tailoredResumeJobs.length ? (
                tailoredResumeJobs.map((job) => (
                  <div className="hf-history-card" key={job._id}>
                    <div className="hf-panel-header">
                      <h3>{job.title || "Untitled role"}</h3>
                      <p>{job.company || "Unknown company"}</p>
                    </div>
                    <div className="hf-variant-list">
                      {job.resumeVariants.map((variant) => (
                        <div
                          className={variant.variantId === job.selectedResumeVariant ? "hf-variant-card active" : "hf-variant-card"}
                          key={`${job._id}-${variant.variantId}`}
                        >
                          <div className="hf-variant-card-head">
                            <span className="hf-chip hf-chip-dark">Version {variant.variantId}</span>
                            <strong>{variant.label}</strong>
                          </div>
                          <p className="hf-muted-line">{variant.strategy}</p>
                          <p className="hf-muted-line">Match Score: {variant.matchScore || 0}%</p>
                          <pre className="hf-asset-preview">{variant.text}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="hf-empty-card hf-empty-card-compact">Tailored resumes will appear here after asset preparation.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
