import { useGameStore } from '../store/gameStore';

export function ProbabilityDashboard() {
  const { players, evidence } = useGameStore();

  // 按邪恶概率排序
  const sortedPlayers = [...players].sort((a, b) => b.evilProbability - a.evilProbability);

  const getProbabilityColor = (prob: number): string => {
    if (prob >= 0.7) return '#ef4444';
    if (prob >= 0.5) return '#f59e0b';
    if (prob >= 0.3) return '#eab308';
    return '#22c55e';
  };

  const getProbabilityLabel = (prob: number): string => {
    if (prob >= 0.7) return '高度可疑';
    if (prob >= 0.5) return '中度可疑';
    if (prob >= 0.3) return '轻度可疑';
    return '相对清白';
  };

  return (
    <div className="probability-dashboard">
      {sortedPlayers.map(player => {
        const prob = player.evilProbability;
        const color = getProbabilityColor(prob);
        const label = getProbabilityLabel(prob);
        const playerEvidence = evidence.get(player.id) ?? [];

        return (
          <div key={player.id} className="player-prob-card">
            <div className="player-header">
              <span className="player-name">{player.id}号</span>
              <span className="prob-label" style={{ color }}>{label}</span>
            </div>

            <div className="prob-bar-container">
              <div
                className="prob-bar"
                style={{
                  width: `${prob * 100}%`,
                  backgroundColor: color,
                }}
              />
              <span className="prob-value">{(prob * 100).toFixed(1)}%</span>
            </div>

            <div className="prob-meter">
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{
                    width: `${prob * 100}%`,
                    background: `linear-gradient(90deg, #22c55e, #eab308, #ef4444)`,
                  }}
                />
                <div
                  className="meter-indicator"
                  style={{ left: `${prob * 100}%` }}
                />
              </div>
              <div className="meter-labels">
                <span>好人</span>
                <span>坏人</span>
              </div>
            </div>

            {playerEvidence.length > 0 && (
              <div className="evidence-section">
                <p className="evidence-title">关键证据：</p>
                <ul className="evidence-list">
                  {playerEvidence.slice(0, 3).map((ev, idx) => (
                    <li key={idx} className="evidence-item">
                      <span className="evidence-type">
                        {ev.type === 'mission_fail' && '❌'}
                        {ev.type === 'mission_success' && '✅'}
                        {ev.type === 'speech_support' && '🤝'}
                        {ev.type === 'speech_oppose' && '⚔️'}
                        {ev.type === 'voted_approve' && '👍'}
                        {ev.type === 'voted_reject' && '👎'}
                      </span>
                      <span className="evidence-desc">{ev.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
