export default function DashboardContainer({
  user,
  dashboardUserInitials,
  dashboardUserName,
  activeDashboardTab,
  goToDashboardTab,
  logout,
  dashboardStatsLoading,
  showStarterInsightsCard,
  jobsWaitingInQueue,
  dashboardStatCards,
  DashboardStatSkeleton,
  StatCard,
  dashboardStatsMessage,
  dashboardStatsError,
  trustIndicators,
  children,
  careerInterviewModal,
}) {
  const StatSkeleton = DashboardStatSkeleton;
  const StatCardComponent = StatCard;

  return (
    <div className="hf-page">
      <div className="hf-bg-glow hf-bg-glow-left" />
      <div className="hf-bg-glow hf-bg-glow-right" />
      <div className="hf-shell">
        <header className="hf-navbar">
          <div className="hf-brand">
            <div className="hf-brand-mark">H</div>
            <div className="hf-brand-copy">
              <span className="hf-brand-eyebrow">HireFlow AI</span>
              <h1>HireFlow AI</h1>
              <p>Auto-apply to jobs intelligently</p>
            </div>
          </div>

          <nav className="hf-navbar-links" aria-label="Primary">
            {[
              { key: "queue", label: "Jobs" },
              { key: "applications", label: "Applications" },
              { key: "resume", label: "Resume" },
              { key: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.key}
                className={activeDashboardTab === item.key ? "hf-navbar-link active" : "hf-navbar-link"}
                onClick={() => goToDashboardTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hf-userbar">
            <div className="hf-user-avatar" aria-hidden="true">{dashboardUserInitials}</div>
            <div className="hf-user-meta">
              <span className="hf-user-label">{dashboardUserName}</span>
              <span className="hf-user-email">{user?.email || "Unknown user"}</span>
            </div>

            <div className="hf-chip-row hf-user-chips">
              <span className="hf-chip hf-chip-red">{user?.plan || "free"}</span>
              <button className="hf-btn hf-btn-ghost" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </header>
        <section className="hf-command-stats">
          {dashboardStatsLoading
            ? Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={`dashboard-stat-${index}`} />)
            : showStarterInsightsCard
              ? (
                <div className="hf-stat-card hf-stat-card-wide">
                  <span>Welcome to HireFlow</span>
                  <strong>{`Welcome to HireFlow, ${dashboardUserName}!`}</strong>
                  <small>{`You have ${jobsWaitingInQueue} jobs waiting in your queue. Start reviewing to send your first application.`}</small>
                  <button className="hf-btn hf-btn-primary hf-btn-small" onClick={() => goToDashboardTab("queue")}>
                    Go to Job Queue →
                  </button>
                </div>
                )
              : dashboardStatCards.map((card) => (
                <StatCardComponent key={card.key} label={card.label} value={card.value} meta={card.meta} />
                ))}
        </section>
        {dashboardStatsLoading ? (
          <p className="hf-status-note">Refreshing dashboard metrics...</p>
        ) : dashboardStatsMessage && !dashboardStatsError ? (
          <p className="hf-status-note hf-status-note-success">{dashboardStatsMessage}</p>
        ) : null}
        <section className="hf-trust-indicators" aria-label="Dashboard signals">
          {trustIndicators.map((item) => (
            <div className="hf-trust-indicator" key={item.key}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        {children}
      </div>

      {careerInterviewModal}
    </div>
  );
}
