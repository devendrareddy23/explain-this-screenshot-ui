export default function ApplicationsSection({
  ControlCenterSection,
  InterviewPrepWorkspace,
  OfferNegotiationWorkspace,
  applicationsSectionSummary,
  appliedCount,
  activeControlSection,
  goToDashboardTab,
  applicationRetryMessage,
  applicationRetryError,
  applicationAnalytics,
  applicationsWithContext,
  updatingApplicationId,
  updateApplicationStatus,
  canRetryApplication,
  handleRetryApplication,
  retryingApplicationId,
  interviewApplications,
  activeInterviewApplication,
  interviewPrepRefreshingId,
  loadInterviewPrep,
  activeInterviewApplicationId,
  setActiveInterviewApplicationId,
  activeInterviewJob,
  activeInterviewPrep,
  interviewPrepLoadingId,
  interviewPrepError,
  interviewAnswerDrafts,
  evaluatingInterviewQuestionKey,
  recordingInterviewQuestionKey,
  updateInterviewAnswerDraft,
  handleEvaluateInterviewAnswer,
  handleStartVoiceInterviewAnswer,
  offerApplications,
  activeOfferApplication,
  handlePrepareOfferStrategy,
  offerActionLoadingKey,
  activeOfferApplicationId,
  setActiveOfferApplicationId,
  activeOfferJob,
  activeOfferStrategy,
  offerStrategyLoadingId,
  offerStrategyError,
  offerDrafts,
  counterGoalDrafts,
  updateOfferDraft,
  updateCounterGoalDraft,
  handleGenerateCounterResponse,
  handleFinalizeOffer,
  handleCopyText,
  applicationsError,
  applicationsLoading,
  generatedCoverLetterJobs,
  coverLetterEdits,
  updateCoverLetterEdit,
}) {
  const Section = ControlCenterSection;
  const InterviewWorkspace = InterviewPrepWorkspace;
  const OfferWorkspace = OfferNegotiationWorkspace;
  const getRecordedStateLabel = (application, job = {}) => {
    if (application?.status === "manual") {
      return "You finished this application manually";
    }

    if (application?.status === "failed") {
      return "HireFlow recorded a failed attempt";
    }

    if (job?.manualActionRequired || job?.manualActionNeeded || job?.manualApplyInProgress) {
      return "You still need to finish this application";
    }

    if (application?.autoApplied || application?.status === "applied") {
      return "Applied by HireFlow";
    }

    return "Application recorded";
  };

  return (
    <Section
      title="Applications"
      subtitle="Track sent jobs, outcomes, and generated assets without leaving the dashboard."
      summary={applicationsSectionSummary}
      open={activeControlSection === "applications"}
      onToggle={() => goToDashboardTab(activeControlSection === "applications" ? "home" : "applications")}
      actionLabel="View Applications"
      onAction={() => goToDashboardTab("applications")}
    >
      <div className="hf-command-tabpanel">
        <div className="hf-panel-header">
          <h3>Applications</h3>
          <p>Track every application HireFlow has already recorded and update what happened next.</p>
        </div>
        <p className="hf-muted-line">
          {appliedCount
            ? "Jobs leave the queue and appear here after HireFlow records them as applications."
            : "Applications appear here only after HireFlow records them or you mark manual completion."}
        </p>
        <p className="hf-muted-line">Recruiter outreach coming soon.</p>
        {applicationRetryMessage ? <p className="hf-success">{applicationRetryMessage}</p> : null}
        {applicationRetryError ? <p className="hf-error">{applicationRetryError}</p> : null}

        {applicationAnalytics?.message ? (
          <div className="hf-winner-banner">
            <span className="hf-chip hf-chip-green">Resume Winner</span>
            <strong>{applicationAnalytics.message}</strong>
          </div>
        ) : null}

        <div className="hf-table-shell">
          <table className="hf-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicationsWithContext.length ? (
                applicationsWithContext.map((application) => {
                  const job = application.jobData || {};
                  return (
                    <tr key={application._id}>
                      <td>
                        {application.title || job.title || "Untitled role"}
                        <div className="hf-table-meta">
                          {getRecordedStateLabel(application, job)}
                        </div>
                        {application.resumeVariant ? (
                          <div className="hf-table-meta">
                            Version {application.resumeVariant} • {application.resumeVariantLabel || "Resume experiment"}
                          </div>
                        ) : null}
                      </td>
                      <td>{application.company || job.company || "Unknown company"}</td>
                      <td>{application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Recently"}</td>
                      <td>
                        <select
                          className="hf-input hf-table-select"
                          value={application.lifecycleStatus}
                          onChange={(e) => updateApplicationStatus(application.job, e.target.value)}
                          disabled={updatingApplicationId === application._id}
                        >
                          {["Applied", "Viewed", "Interview", "Offer", "Negotiating", "Rejected"].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{application.source || job.source || "Unknown"}</td>
                      <td>
                        {canRetryApplication(application) ? (
                          <button
                            className="hf-btn hf-btn-secondary hf-btn-small"
                            onClick={() => handleRetryApplication(application)}
                            disabled={retryingApplicationId === application._id}
                          >
                            {retryingApplicationId === application._id ? "Retrying..." : "Retry"}
                          </button>
                        ) : (
                          <span className="hf-muted-line">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="hf-empty-card hf-empty-card-compact">Applied jobs will appear here.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {applicationAnalytics?.variants?.length ? (
          <div className="hf-variant-scoreboard">
            {applicationAnalytics.variants.map((variant) => (
              <div className="hf-variant-score-card" key={variant.variantId}>
                <span className="hf-chip hf-chip-dark">Version {variant.variantId}</span>
                <strong>{variant.responseRate}% response rate</strong>
                <p>
                  {variant.appliedCount} applications • {variant.responseCount} positive responses
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {interviewApplications.length ? (
          <div className="hf-interview-command">
            <div className="hf-interview-command-head">
              <div>
                <span className="hf-chip hf-chip-blue">Interview Mode</span>
                <h4>Complete prep guide for upcoming interviews</h4>
                <p>
                  HireFlow pulls the role context, researches the company, predicts likely questions, and coaches
                  your answers in one workspace.
                </p>
              </div>
              {activeInterviewApplication ? (
                <button
                  className="hf-btn hf-btn-secondary"
                  onClick={() => loadInterviewPrep(activeInterviewApplication._id, { force: true })}
                  disabled={interviewPrepRefreshingId === activeInterviewApplication._id}
                >
                  {interviewPrepRefreshingId === activeInterviewApplication._id ? "Refreshing..." : "Refresh Prep Guide"}
                </button>
              ) : null}
            </div>

            <div className="hf-interview-selector">
              {interviewApplications.map((application) => (
                <button
                  key={application._id}
                  className={
                    activeInterviewApplicationId === application._id
                      ? "hf-interview-selector-item active"
                      : "hf-interview-selector-item"
                  }
                  onClick={() => setActiveInterviewApplicationId(application._id)}
                >
                  <strong>{application.company || "Interview"}</strong>
                  <span>{application.title || "Role"}</span>
                </button>
              ))}
            </div>

            {activeInterviewApplication ? (
              <InterviewWorkspace
                application={activeInterviewApplication}
                job={activeInterviewJob}
                prep={activeInterviewPrep}
                loading={interviewPrepLoadingId === activeInterviewApplication._id}
                error={interviewPrepError}
                answerDrafts={interviewAnswerDrafts}
                evaluatingKey={evaluatingInterviewQuestionKey}
                recordingKey={recordingInterviewQuestionKey}
                onAnswerChange={updateInterviewAnswerDraft}
                onSubmitAnswer={handleEvaluateInterviewAnswer}
                onVoiceAnswer={handleStartVoiceInterviewAnswer}
              />
            ) : null}
          </div>
        ) : null}
        {offerApplications.length ? (
          <div className="hf-offer-command">
            <div className="hf-interview-command-head">
              <div>
                <span className="hf-chip hf-chip-green">Offer Strategy</span>
                <h4>Market benchmark and negotiation scripts for live offers</h4>
                <p>
                  HireFlow compares the package against the strongest compensation signals available, tells you
                  whether to negotiate, and gives you exact wording for the next reply.
                </p>
              </div>
              {activeOfferApplication ? (
                <button
                  className="hf-btn hf-btn-secondary"
                  onClick={() => handlePrepareOfferStrategy(activeOfferApplication._id)}
                  disabled={offerActionLoadingKey === `${activeOfferApplication._id}:prepare`}
                >
                  {offerActionLoadingKey === `${activeOfferApplication._id}:prepare`
                    ? "Benchmarking..."
                    : "Refresh Offer Strategy"}
                </button>
              ) : null}
            </div>

            <div className="hf-interview-selector">
              {offerApplications.map((application) => (
                <button
                  key={application._id}
                  className={
                    activeOfferApplicationId === application._id
                      ? "hf-interview-selector-item active"
                      : "hf-interview-selector-item"
                  }
                  onClick={() => setActiveOfferApplicationId(application._id)}
                >
                  <strong>{application.company || "Offer"}</strong>
                  <span>{application.title || "Role"}</span>
                </button>
              ))}
            </div>

            {activeOfferApplication ? (
              <OfferWorkspace
                application={activeOfferApplication}
                job={activeOfferJob}
                strategy={activeOfferStrategy}
                loading={offerStrategyLoadingId === activeOfferApplication._id}
                error={offerStrategyError}
                draft={offerDrafts[activeOfferApplication._id] || {}}
                counterGoal={counterGoalDrafts[activeOfferApplication._id] || ""}
                actionLoadingKey={offerActionLoadingKey}
                onDraftChange={updateOfferDraft}
                onCounterGoalChange={updateCounterGoalDraft}
                onPrepare={handlePrepareOfferStrategy}
                onCounter={handleGenerateCounterResponse}
                onFinalize={handleFinalizeOffer}
                onCopy={handleCopyText}
              />
            ) : null}
          </div>
        ) : null}
        {applicationsError ? <p className="hf-error">{applicationsError}</p> : null}
        {applicationsLoading ? <p className="hf-muted-line">Loading application analytics...</p> : null}
        <div className="hf-panel hf-panel-nested">
          <div className="hf-panel-header">
            <h3>Prepare Application</h3>
            <p>Review the tailored cover letters already prepared for the jobs moving through your pipeline.</p>
          </div>

          <div className="hf-history-list">
            {generatedCoverLetterJobs.length ? (
              generatedCoverLetterJobs.map((job) => (
                <div className="hf-history-card" key={job._id}>
                  <div className="hf-panel-header">
                    <h3>{job.title || "Untitled role"}</h3>
                    <p>{job.company || "Unknown company"}</p>
                  </div>
                  <textarea
                    className="hf-textarea hf-cover-letter-editor"
                    value={coverLetterEdits[job._id] ?? job.coverLetterText}
                    onChange={(e) => updateCoverLetterEdit(job._id, e.target.value)}
                  />
                  <div className="hf-panel-actions">
                    <button
                      className="hf-btn hf-btn-secondary"
                      onClick={() => handleCopyText(coverLetterEdits[job._id] ?? job.coverLetterText, "Cover letter copied.")}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="hf-empty-card">Prepare a matched job first to generate the resume and cover letter assets you need.</div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
