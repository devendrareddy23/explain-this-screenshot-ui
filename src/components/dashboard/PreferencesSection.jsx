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
  careerDna,
  hardSkills,
  softSkills,
  setCareerInterviewOpen,
  setCareerInterviewStep,
  careerInterviewCompletedAt,
  successfulReferrals,
  freeMonthsEarned,
  bonusWeeksGranted,
  referralLoading,
  referralLink,
  handleInviteFriends,
  handleCopyReferralLink,
  connections,
  connectionsLoading,
  connectionsError,
  inviteMessage,
  referralError,
  sourceCatalogLoading,
  sourceCatalogError,
  groupedSourceCatalog,
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
      subtitle="Keep your search preferences, career profile, and source settings clean and up to date."
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
            <div className="hf-field-block">
              <label className="hf-label">Preferred Roles</label>
              <input
                className="hf-input"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="Backend engineer, product manager"
              />
            </div>
            <div className="hf-field-block">
              <label className="hf-label">Preferred Locations</label>
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

            <details className="hf-settings-accordion">
              <summary>Referral Program</summary>
              <div className="hf-settings-accordion-body">
                <p className="hf-muted-line">
                  Invite friends and earn free time on your plan as they join HireFlow.
                </p>
                <div className="hf-referral-stats">
                  <div className="hf-referral-metric">
                    <strong>{successfulReferrals}</strong>
                    <span>Friends joined</span>
                  </div>
                  <div className="hf-referral-metric">
                    <strong>{freeMonthsEarned}</strong>
                    <span>Free months earned</span>
                  </div>
                  <div className="hf-referral-metric">
                    <strong>{bonusWeeksGranted}</strong>
                    <span>Bonus weeks claimed</span>
                  </div>
                </div>
                <div className="hf-referral-link-box">
                  <span className="hf-label">Your invite link</span>
                  <p>{referralLoading ? "Loading your referral link..." : (referralLink || "Referral link unavailable right now.")}</p>
                </div>
                <div className="hf-panel-actions">
                  <button className="hf-btn hf-btn-primary" onClick={handleInviteFriends}>Invite Friends</button>
                  <button className="hf-btn hf-btn-secondary" onClick={handleCopyReferralLink} disabled={!referralLink}>
                    Copy Link
                  </button>
                </div>
                <p className="hf-muted-line">
                  LinkedIn connect coming soon. {connections.length ? `${connections.length} saved referral connections are already on file.` : ""}
                </p>
                {connectionsLoading ? <p className="hf-muted-line">Checking referral connection status...</p> : null}
                {connectionsError ? <p className="hf-error">{connectionsError}</p> : null}
                {inviteMessage ? <p className="hf-success">{inviteMessage}</p> : null}
                {referralError ? <p className="hf-error">{referralError}</p> : null}
              </div>
            </details>

            <details className="hf-settings-accordion">
              <summary>About our sources</summary>
              <div className="hf-settings-accordion-body">
                {sourceCatalogLoading ? <p className="hf-muted-line">Loading source catalog...</p> : null}
                {sourceCatalogError ? <p className="hf-error">{sourceCatalogError}</p> : null}
                {[
                  { key: "india", label: "India" },
                  { key: "global", label: "Global" },
                  { key: "startup", label: "Startup" },
                  { key: "niche", label: "Niche" },
                ].map((group) =>
                  groupedSourceCatalog[group.key]?.length ? (
                    <div className="hf-source-group" key={group.key}>
                      <div className="hf-source-group-head">
                        <h4>{group.label}</h4>
                        <span className="hf-chip hf-chip-dark">{groupedSourceCatalog[group.key].length} sources</span>
                      </div>
                      <div className="hf-source-grid">
                        {groupedSourceCatalog[group.key].map((source) => (
                          <div className="hf-source-card" key={source.key || source.name}>
                            <div className="hf-source-card-top">
                              <div>
                                <strong>{source.name}</strong>
                                <p>{source.market}</p>
                              </div>
                              <div className="hf-chip-row">
                                <span className={source.autoApplySupported ? "hf-chip hf-chip-blue" : "hf-chip hf-chip-amber"}>
                                  {source.autoApplyLabel || (source.autoApplySupported ? "Auto Apply" : "Manual Apply")}
                                </span>
                                <span className={source.liveSearchImplemented ? "hf-chip hf-chip-green" : "hf-chip hf-chip-dark"}>
                                  {source.liveSearchImplemented ? "Live" : source.status === "inactive" ? "Inactive" : "Planned"}
                                </span>
                              </div>
                            </div>
                            <span>Search: {source.searchSupport}</span>
                            <span>Shortlist: {source.shortlistSupport}</span>
                            <p className="hf-source-note" title={source.manualActionReason}>
                              {source.manualActionReason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
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
