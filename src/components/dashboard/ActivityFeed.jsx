export default function ActivityFeed({ liveActivityFeed = [] }) {
  return (
    <div className="hf-war-column hf-panel">
      <div className="hf-panel-header">
        <h3>Live Activity Feed</h3>
        <p>The latest moves, openings, and high-signal changes happening right now.</p>
      </div>

      <div className="hf-activity-feed">
        {liveActivityFeed.length ? (
          liveActivityFeed.map((item) => (
            <div className="hf-activity-item" key={item.id}>
              <span className={`hf-chip ${item.tone}`}>{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <span className="hf-activity-time">{item.timeAgo}</span>
            </div>
          ))
        ) : (
          <div className="hf-empty-card hf-empty-card-compact">
            Activity will appear here as jobs are matched, applied, and updated.
          </div>
        )}
      </div>
    </div>
  );
}
