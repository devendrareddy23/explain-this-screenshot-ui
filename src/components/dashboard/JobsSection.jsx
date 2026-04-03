export default function JobsSection({
  ControlCenterSection,
  QueueStateCard,
  JobSkeleton,
  QueuePreviewCard,
  JobCard,
  queueSectionSummary,
  activeControlSection,
  goToDashboardTab,
  handleJobsRefreshNow,
  jobsLoading,
  queueTotalToday,
  queueFilter,
  setQueueFilter,
  queueActionMessage,
  queueActionError,
  jobsError,
  savedJobsError,
  visibleQueuedJobs,
  appliedCount,
  queueReviewedToday,
  queueAppliedToday,
  quickSettingsRef,
  filteredQueuedJobs,
  queueProgressLabel,
  queueProgressPercent,
  queueStackJobs,
  activeQueueJob,
  handleManualApplyStart,
  handleMarkApplied,
  applyingJobId,
  appliedJobId,
  handleSkipJob,
  skippingJobId,
  swipeOffsetX,
  handleQueueTouchStart,
  handleQueueTouchMove,
  handleQueueTouchEnd,
}) {
  const Section = ControlCenterSection;
  const StateCard = QueueStateCard;
  const SkeletonCard = JobSkeleton;
  const PreviewCard = QueuePreviewCard;
  const QueueJobCard = JobCard;
  const sourceFilters = Array.from(
    new Map(
      visibleQueuedJobs
        .filter((job) => job?.source)
        .map((job) => {
          const key = String(job.source || "")
            .trim()
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/\+/g, "plus")
            .replace(/\s+/g, "");

          return [key, { key, label: job.source }];
        })
    ).values()
  ).slice(0, 5);
  const filterPills = [
    { key: "all", label: "All" },
    { key: "remote", label: "Remote" },
    ...sourceFilters,
  ];

  return (
    <Section
      title="Job Queue"
      subtitle="Review matched roles, prepare assets, and move the strongest jobs forward."
      summary={queueSectionSummary}
      open={activeControlSection === "queue"}
      onToggle={() => goToDashboardTab(activeControlSection === "queue" ? "home" : "queue")}
      actionLabel="Find Jobs Now"
      onAction={handleJobsRefreshNow}
      actionDisabled={jobsLoading}
    >
      <div className="hf-command-tabpanel">
        <div className="hf-queue-topbar">
          <div>
            <h3>Your Job Queue</h3>
            <p>{queueTotalToday} matches today</p>
          </div>

          <div className="hf-filter-pills" role="tablist" aria-label="Queue filters">
            {filterPills.map((filter) => (
              <button
                key={filter.key}
                className={queueFilter === filter.key ? "hf-filter-pill active" : "hf-filter-pill"}
                onClick={() => setQueueFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {queueActionMessage ? <p className="hf-success">{queueActionMessage}</p> : null}
        {queueActionError ? <p className="hf-error">{queueActionError}</p> : null}

        {jobsLoading ? (
          <div className="hf-queue-state-shell">
            <div className="hf-card-row hf-card-row-centered">
            {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={`queue-skeleton-${index}`} />
              ))}
            </div>
          </div>
        ) : (jobsError || savedJobsError) ? (
          <StateCard
            icon="⚠️"
            title="Something went wrong"
            subtitle="We couldn't load your jobs right now."
            actionLabel="Try again"
            onAction={handleJobsRefreshNow}
          />
        ) : !visibleQueuedJobs.length && queueReviewedToday > 0 ? (
          <StateCard
            variant="success"
            icon="✓"
            title="You're all caught up!"
            subtitle={`HireFlow moved ${queueAppliedToday} job${queueAppliedToday === 1 ? "" : "s"} forward today`}
            secondaryText="New matches will appear here as soon as HireFlow finds them."
            actionLabel="View my applications →"
            onAction={() => goToDashboardTab("applications")}
          />
        ) : !visibleQueuedJobs.length ? (
          <StateCard
            icon="🔍"
            title={appliedCount > 0 ? "Your queue is clear" : "No matches yet"}
            subtitle={
              appliedCount > 0
                ? "Jobs move out of this queue after HireFlow records them in Applications."
                : "Complete your profile to get better job matches."
            }
            secondaryText={
              appliedCount > 0
                ? "That means there is nothing waiting for review right now. Open Applications to review what already moved forward."
                : "Add your preferred roles, locations, and resume so HireFlow can search more accurately. You can also run a search right now with default India software roles."
            }
            actionLabel={appliedCount > 0 ? "View Applications →" : "Set Up Profile"}
            onAction={
              appliedCount > 0
                ? () => goToDashboardTab("applications")
                : () => quickSettingsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            secondaryActionLabel={appliedCount > 0 ? "" : "Search for Jobs Now"}
            onSecondaryAction={appliedCount > 0 ? null : handleJobsRefreshNow}
          />
        ) : filteredQueuedJobs.length ? (
          <div className="hf-queue-stage">
            <div className="hf-queue-progress">
              <div className="hf-queue-progress-meta">
                <span>{queueProgressLabel}</span>
                <span>{Math.round(queueProgressPercent)}%</span>
              </div>
              <div className="hf-queue-progress-bar">
                <div className="hf-queue-progress-fill" style={{ width: `${queueProgressPercent}%` }} />
              </div>
            </div>

              <div className="hf-queue-stack-shell">
                {queueStackJobs.slice(1).map((job, index) => (
                <PreviewCard key={job._id} job={job} depth={index + 1} />
              ))}

              {activeQueueJob ? (
                <QueueJobCard
                  key={activeQueueJob._id}
                  job={activeQueueJob}
                  onStartManualApply={() => handleManualApplyStart(activeQueueJob)}
                  onMarkApplied={() => handleMarkApplied(activeQueueJob)}
                  applying={applyingJobId === activeQueueJob._id}
                  appliedSuccess={appliedJobId === activeQueueJob._id}
                  onSkip={() => handleSkipJob(activeQueueJob._id)}
                  skipping={skippingJobId === activeQueueJob._id}
                  swipeOffsetX={swipeOffsetX}
                  onTouchStart={handleQueueTouchStart}
                  onTouchMove={handleQueueTouchMove}
                  onTouchEnd={handleQueueTouchEnd}
                />
              ) : null}
            </div>

            <p className="hf-queue-shortcuts">← Left arrow or A = Skip &nbsp;&nbsp; • &nbsp;&nbsp; → Right arrow or D = Apply &nbsp;&nbsp; • &nbsp;&nbsp; Space = View full job details</p>
            <p className="hf-queue-hint">← Skip<span>Apply →</span><span>Space to view details</span></p>
          </div>
        ) : (
          <StateCard
            icon="🔍"
            title={`No ${queueFilter === "all" ? "matching" : queueFilter} jobs yet`}
            subtitle="We're searching across 40+ job boards."
            secondaryText="Try another filter or give HireFlow a little time to find more matches."
            actionLabel="Update my preferences →"
            onAction={() => quickSettingsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          />
        )}
      </div>
    </Section>
  );
}
