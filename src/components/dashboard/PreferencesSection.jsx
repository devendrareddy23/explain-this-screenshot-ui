export default function PreferencesSection({
  ControlCenterSection,
  settingsSectionSummary,
  activeControlSection,
  goToDashboardTab,
  handleSavePreferences,
  preferencesSaving,
  jobRole,
  setJobRole,
  jobLocation,
  setJobLocation,
  workTypes,
  setWorkTypes,
  handleJobsRefreshNow,
  jobsLoading,
  careerDna,
  hardSkills,
  softSkills,
  setCareerInterviewOpen,
  setCareerInterviewStep,
  careerInterviewCompletedAt,
  activeDashboardTab,
  user,
  applicationsLimit,
  planUsagePercent,
  applicationsUsed,
}) {
  const Section = ControlCenterSection;

  return (
    <Section
      title="Preferences & Settings"
      subtitle="Keep your search preferences clean and up to date."
      summary={settingsSectionSummary}
      open={activeControlSection === "settings"}
      onToggle={() => goToDashboardTab(activeControlSection === "settings" ? "home" : "settings")}
      actionLabel="Save Preferences"
      onAction={handleSavePreferences}
      actionDisabled={preferencesSaving}
    >
      <div className="hf-command-tabpanel">
        <div className="hf-panel-header">
          <h3>User Settings</h3>
          <p>Adjust your search preferences and work-style filters.</p>
        </div>

        <div className="hf-command-grid">
          <div className="hf-panel hf-panel-nested">
            <div className="hf-panel-header">
              <h3>Queue Settings</h3>
              <p>Adjust work type, roles, and locations from one simple panel.</p>
            </div>
            <div className="hf-field-block">
              <label className="hf-label">Roles</label>
              <input
                className="hf-input"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="Backend engineer, product manager"
              />
            </div>
            <div className="hf-field-block">
              <label className="hf-label">Locations</label>
              <input
                className="hf-input"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="Bengaluru, Remote, San Francisco"
              />
            </div>
            <div className="hf-field-block">
              <label className="hf-label">Work Types</label>
              <div className="hf-chip-row">
                {["remote", "hybrid", "onsite"].map((type) => (
                  <button
                    key={type}
                    className={workTypes.includes(type) ? "hf-chip hf-chip-green" : "hf-chip hf-chip-dark"}
                    onClick={() =>
                      setWorkTypes((prev) =>
                        prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
                      )
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="hf-panel-actions">
              <button className="hf-btn hf-btn-secondary" onClick={handleJobsRefreshNow} disabled={jobsLoading}>
                {jobsLoading ? "Searching..." : "Find Jobs Now"}
              </button>
              <button className="hf-btn hf-btn-primary" onClick={handleSavePreferences} disabled={preferencesSaving}>
                {preferencesSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          <div className="hf-panel hf-panel-nested">
            <details className="hf-settings-accordion">
              <summary>Career Profile</summary>
              <div className="hf-settings-accordion-body">
                <p className="hf-muted-line">
                  {careerDna?.summary || "Complete your Career DNA interview so HireFlow can personalize matching and automation."}
                </p>
                <div className="hf-chip-row">
                  {hardSkills.slice(0, 4).map((item) => (
                    <span className="hf-chip hf-chip-blue" key={`settings-hard-${item.name}`}>
                      {item.name}
                    </span>
                  ))}
                  {softSkills.slice(0, 3).map((item) => (
                    <span className="hf-chip hf-chip-green" key={`settings-soft-${item.name}`}>
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="hf-panel-actions">
                  <button
                    className="hf-btn hf-btn-secondary"
                    onClick={() => {
                      setCareerInterviewOpen(true);
                      setCareerInterviewStep(0);
                    }}
                  >
                    {careerInterviewCompletedAt ? "Open Career Profile" : "Start Career Profile"}
                  </button>
                </div>
              </div>
            </details>

            <details className="hf-settings-accordion" open={activeDashboardTab === "billing"}>
              <summary>Billing</summary>
              <div className="hf-settings-accordion-body">
                <div className="hf-command-grid">
                  <div className="hf-panel hf-panel-nested">
                    <span className="hf-label">Current Plan</span>
                    <div className="hf-chip-row">
                      <span className="hf-chip hf-chip-red">{user?.plan || "free"}</span>
                      <span className="hf-chip hf-chip-dark">{user?.status || "active"}</span>
                    </div>
                    <div className="hf-usage-bar">
                      <div
                        className="hf-usage-fill"
                        style={{ width: applicationsLimit === Infinity ? "22%" : `${planUsagePercent}%` }}
                      />
                    </div>
                    <p className="hf-muted-line">
                      {applicationsLimit === Infinity
                        ? `${applicationsUsed} applications used this cycle`
                        : `${applicationsUsed} of ${applicationsLimit} applications used`}
                    </p>
                    <div className="hf-panel-actions">
                      <button className="hf-btn hf-btn-primary">Upgrade Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </Section>
  );
}
