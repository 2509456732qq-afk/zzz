import { useGameStore } from '../store/gameStore';

export function VoteTimeline() {
  const { missions } = useGameStore();

  if (missions.length === 0) {
    return (
      <div className="vote-timeline-empty">
        <p>📋 暂无任务记录</p>
        <p className="hint">在数据录入页面添加任务记录后，这里会显示投票时间线</p>
      </div>
    );
  }

  const getResultEmoji = (result?: string) => {
    switch (result) {
      case 'success': return '✅';
      case 'fail': return '❌';
      default: return '⏳';
    }
  };

  const getResultLabel = (result?: string) => {
    switch (result) {
      case 'success': return '任务成功';
      case 'fail': return '任务失败';
      default: return '待定';
    }
  };

  return (
    <div className="vote-timeline">
      {missions.map((mission, idx) => (
        <div
          key={idx}
          className={`mission-card ${
            !mission.teamApproved
              ? 'rejected'
              : mission.result || 'pending'
          }`}
        >
          <div className="mission-header">
            <span className="round-badge">第 {mission.round} 轮</span>
            <span className="result-badge">
              {!mission.teamApproved
                ? '🚫 组队否决'
                : `${getResultEmoji(mission.result)} ${getResultLabel(mission.result)}`}
            </span>
          </div>

          <div className="mission-details">
            {/* 队长 */}
            <div className="detail-row">
              <span className="detail-label">队长：</span>
              <span className="detail-value leader-value">
                {mission.leader}号 👑
              </span>
            </div>

            {/* 队伍成员 */}
            {mission.team.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">队伍：</span>
                <div className="team-members">
                  {mission.team.map(id => (
                    <span
                      key={id}
                      className={`team-member ${id === mission.leader ? 'is-leader' : ''}`}
                    >
                      {id}号
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 组队投票详情 */}
            {mission.teamVotes.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">投票：</span>
                <div className="vote-chips">
                  {mission.teamVotes.map((vote, vIdx) => (
                    <span
                      key={vIdx}
                      className={`vote-chip ${vote.approve ? 'approve' : 'reject'}`}
                    >
                      {vote.voter}号 {vote.approve ? '👍' : '👎'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 投票结果 */}
            <div className="detail-row">
              <span className="detail-label">结果：</span>
              <span className="detail-value">
                {mission.teamApproved ? '✅ 组队通过' : '❌ 组队否决'}
                {mission.result === 'fail' && mission.missionVotes && (
                  <span className="fail-count">
                    （{mission.missionVotes.filter(v => !v.success).length}张失败票）
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 投票统计条 */}
          {mission.teamVotes.length > 0 && (
            <div className="vote-bar">
              <div
                className="approve-bar"
                style={{
                  width: `${
                    (mission.teamVotes.filter(v => v.approve).length /
                      mission.teamVotes.length) *
                    100
                  }%`,
                }}
              />
              <div
                className="reject-bar"
                style={{
                  width: `${
                    (mission.teamVotes.filter(v => !v.approve).length /
                      mission.teamVotes.length) *
                    100
                  }%`,
                }}
              />
            </div>
          )}
        </div>
      ))}

      {/* 任务结果汇总 */}
      <div className="mission-summary">
        <h3>任务结果汇总</h3>

        {/* 每轮详细信息 */}
        <div className="summary-details">
          {missions.map((mission, idx) => (
            <div key={idx} className="summary-row">
              <span className="summary-round">R{mission.round}</span>
              <span className="summary-status">
                {!mission.teamApproved
                  ? '🚫否决'
                  : mission.result === 'success'
                    ? '✅成功'
                    : '❌失败'}
              </span>
              <span className="summary-team">
                {mission.team.length > 0
                  ? mission.team.map(id => `${id}号`).join('、')
                  : '无队伍'}
              </span>
              <span className="summary-votes">
                {mission.teamVotes.filter(v => v.approve).length}👍 /{' '}
                {mission.teamVotes.filter(v => !v.approve).length}👎
              </span>
            </div>
          ))}
        </div>

        {/* 汇总统计 */}
        <div className="summary-bar">
          {missions.map((mission, idx) => (
            <div
              key={idx}
              className={`summary-segment ${
                !mission.teamApproved
                  ? 'rejected'
                  : mission.result || 'pending'
              }`}
              title={`第${mission.round}轮：${
                !mission.teamApproved
                  ? '组队否决'
                  : mission.result === 'success'
                    ? '任务成功'
                    : '任务失败'
              }`}
            >
              {!mission.teamApproved ? '🚫' : getResultEmoji(mission.result)}
            </div>
          ))}
        </div>

        <div className="summary-counts">
          <span className="success-count">
            ✅ 成功：{missions.filter(m => m.result === 'success').length}
          </span>
          <span className="fail-count">
            ❌ 失败：{missions.filter(m => m.result === 'fail').length}
          </span>
          <span className="reject-count">
            🚫 否决：{missions.filter(m => !m.teamApproved).length}
          </span>
        </div>
      </div>
    </div>
  );
}
