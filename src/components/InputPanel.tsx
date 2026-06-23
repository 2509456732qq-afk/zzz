import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Team } from '../types';

export function InputPanel() {
  const {
    playerCount,
    parseSpeech,
    addMission,
    stances,
    missions,
    knownIdentities,
    addKnownIdentity,
    removeKnownIdentity,
  } = useGameStore();

  // 快速录入模式
  const [quickMode, setQuickMode] = useState(true);

  // 发言输入
  const [speechText, setSpeechText] = useState('');
  const [speechRound, setSpeechRound] = useState(1);

  // 任务快速录入
  const [quickLeader, setQuickLeader] = useState<number | null>(null);
  const [quickTeam, setQuickTeam] = useState<number[]>([]);
  const [quickResult, setQuickResult] = useState<'success' | 'fail' | null>(null);
  const [teamApproved, setTeamApproved] = useState<boolean | null>(null);

  // 投票记录（赞成/反对）
  const [votes, setVotes] = useState<Record<number, boolean | null>>({});

  // 身份录入
  const [identityPlayer, setIdentityPlayer] = useState<number | null>(null);
  const [identityTeam, setIdentityTeam] = useState<Team | null>(null);

  // 显示解析结果
  const [parseResult, setParseResult] = useState<string>('');

  // 切换队伍成员
  const toggleTeamMember = (id: number) => {
    setQuickTeam(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 设置投票
  const setVote = (playerId: number, approve: boolean) => {
    setVotes(prev => ({
      ...prev,
      [playerId]: prev[playerId] === approve ? null : approve,
    }));
  };

  // 全部赞成
  const setAllApprove = () => {
    const newVotes: Record<number, boolean | null> = {};
    for (let i = 1; i <= playerCount; i++) {
      newVotes[i] = true;
    }
    setVotes(newVotes);
  };

  // 全部反对
  const setAllReject = () => {
    const newVotes: Record<number, boolean | null> = {};
    for (let i = 1; i <= playerCount; i++) {
      newVotes[i] = false;
    }
    setVotes(newVotes);
  };

  // 队长赞成，其余反对
  const setLeaderApproveOthersReject = () => {
    if (!quickLeader) return;
    const newVotes: Record<number, boolean | null> = {};
    for (let i = 1; i <= playerCount; i++) {
      newVotes[i] = i === quickLeader ? true : false;
    }
    setVotes(newVotes);
  };

  // 队长反对，其余赞成
  const setLeaderRejectOthersApprove = () => {
    if (!quickLeader) return;
    const newVotes: Record<number, boolean | null> = {};
    for (let i = 1; i <= playerCount; i++) {
      newVotes[i] = i === quickLeader ? false : true;
    }
    setVotes(newVotes);
  };

  // 处理发言解析
  const handleParseSpeech = () => {
    if (!speechText.trim()) return;
    parseSpeech(speechText, speechRound);
    setParseResult(`✅ 第 ${speechRound} 轮发言已解析`);
    setSpeechText('');
  };

  // 快速添加任务
  const handleQuickAddMission = () => {
    if (!quickLeader) {
      setParseResult('⚠️ 请选择队长');
      return;
    }

    if (teamApproved === null) {
      setParseResult('⚠️ 请选择组队是否通过');
      return;
    }

    // 构建投票记录
    const teamVotes = Object.entries(votes)
      .filter(([_, v]) => v !== null)
      .map(([voter, approve]) => ({
        voter: parseInt(voter),
        approve: approve as boolean,
      }));

    // 计算是否通过
    const approveCount = teamVotes.filter(v => v.approve).length;
    const rejectCount = teamVotes.filter(v => !v.approve).length;
    const approved = teamApproved;

    // 如果组队通过，需要队伍成员和任务结果
    if (approved) {
      if (quickTeam.length === 0) {
        setParseResult('⚠️ 组队通过后请选择队伍成员');
        return;
      }
      if (!quickResult) {
        setParseResult('⚠️ 组队通过后请选择任务结果');
        return;
      }
    }

    const missionRound = missions.length + 1;

    addMission({
      round: missionRound,
      leader: quickLeader,
      team: approved ? quickTeam : [],
      teamVotes,
      teamApproved: approved,
      missionVotes: approved
        ? quickTeam.map(voter => ({
            voter,
            success: quickResult === 'success',
          }))
        : undefined,
      result: approved ? quickResult! : undefined,
    });

    const statusText = approved
      ? `任务${quickResult === 'success' ? '成功' : '失败'}`
      : '组队被否决';

    setParseResult(
      `✅ 第 ${missionRound} 轮已记录：${statusText}（${approveCount}赞成/${rejectCount}反对）`
    );

    // 重置
    setQuickLeader(null);
    setQuickTeam([]);
    setQuickResult(null);
    setVotes({});
    setTeamApproved(null);
  };

  // 获取当前轮次建议
  const suggestedRound = Math.min(5, Math.floor(missions.length) + 1);

  // 统计当前投票
  const currentApproveCount = Object.values(votes).filter(v => v === true).length;
  const currentRejectCount = Object.values(votes).filter(v => v === false).length;

  // 添加已知身份
  const handleAddIdentity = () => {
    if (!identityPlayer || !identityTeam) {
      setParseResult('⚠️ 请选择玩家和身份');
      return;
    }

    addKnownIdentity({
      playerId: identityPlayer,
      team: identityTeam,
      revealedRound: missions.length + 1,
    });

    setParseResult(
      `✅ 已记录 ${identityPlayer}号 为${identityTeam === 'good' ? '好人' : '坏人'}`
    );
    setIdentityPlayer(null);
    setIdentityTeam(null);
  };

  return (
    <div className="input-panel">
      {/* 模式切换 */}
      <div className="mode-switch">
        <button
          className={`mode-btn ${quickMode ? 'active' : ''}`}
          onClick={() => setQuickMode(true)}
        >
          ⚡ 快速录入
        </button>
        <button
          className={`mode-btn ${!quickMode ? 'active' : ''}`}
          onClick={() => setQuickMode(false)}
        >
          📝 详细录入
        </button>
      </div>

      {quickMode ? (
        <div className="quick-input-panel">
          {/* ========== 身份录入面板 ========== */}
          <div className="input-section-card identity-card">
            <h3>🎭 已知身份（可选，最多2个）</h3>
            <p className="input-hint">
              如果你知道某些玩家的真实身份，录入后分析会更准确
            </p>

            {knownIdentities.length > 0 && (
              <div className="known-identities">
                {knownIdentities.map(ki => (
                  <div key={ki.playerId} className={`identity-badge ${ki.team}`}>
                    <span>{ki.playerId}号</span>
                    <span className="identity-label">
                      {ki.team === 'good' ? '好人' : '坏人'}
                    </span>
                    <button
                      className="remove-btn"
                      onClick={() => removeKnownIdentity(ki.playerId)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {knownIdentities.length < 2 && (
              <div className="identity-form">
                <div className="identity-row">
                  <label className="section-label">玩家</label>
                  <div className="player-chips small">
                    {Array.from({ length: playerCount }, (_, i) => i + 1).map(id => (
                      <button
                        key={id}
                        className={`player-chip ${identityPlayer === id ? 'selected' : ''}`}
                        onClick={() => setIdentityPlayer(id)}
                      >
                        {id}号
                      </button>
                    ))}
                  </div>
                </div>
                <div className="identity-row">
                  <label className="section-label">真实身份</label>
                  <div className="result-buttons">
                    <button
                      className={`result-btn success ${identityTeam === 'good' ? 'selected' : ''}`}
                      onClick={() => setIdentityTeam('good')}
                    >
                      😇 好人
                    </button>
                    <button
                      className={`result-btn fail ${identityTeam === 'evil' ? 'selected' : ''}`}
                      onClick={() => setIdentityTeam('evil')}
                    >
                      😈 坏人
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary btn-full" onClick={handleAddIdentity}>
                  ➕ 记录身份
                </button>
              </div>
            )}
          </div>

          {/* ========== 任务快速录入 ========== */}
          <div className="input-section-card">
            <h3>🎯 记录任务（第 {missions.length + 1} 轮）</h3>

            {/* 选择队长 */}
            <div className="quick-section">
              <label className="section-label">1. 队长</label>
              <div className="player-chips">
                {Array.from({ length: playerCount }, (_, i) => i + 1).map(id => (
                  <button
                    key={id}
                    className={`player-chip ${quickLeader === id ? 'selected' : ''}`}
                    onClick={() => {
                      setQuickLeader(id);
                      // 清空之前的投票
                      setVotes({});
                    }}
                  >
                    {id}号
                  </button>
                ))}
              </div>
            </div>

            {/* 组队投票 */}
            <div className="quick-section">
              <label className="section-label">
                2. 组队投票
                {currentApproveCount + currentRejectCount > 0 && (
                  <span className="vote-summary">
                    ：{currentApproveCount} 👍 / {currentRejectCount} 👎
                  </span>
                )}
              </label>

              {/* 快捷按钮 */}
              <div className="vote-shortcuts">
                <button className="shortcut-btn" onClick={setAllApprove}>
                  全部赞成
                </button>
                <button className="shortcut-btn" onClick={setAllReject}>
                  全部反对
                </button>
                {quickLeader && (
                  <>
                    <button className="shortcut-btn" onClick={setLeaderApproveOthersReject}>
                      {quickLeader}号赞，其余反
                    </button>
                    <button className="shortcut-btn" onClick={setLeaderRejectOthersApprove}>
                      {quickLeader}号反，其余赞
                    </button>
                  </>
                )}
              </div>

              {/* 逐个投票 */}
              <div className="vote-grid">
                {Array.from({ length: playerCount }, (_, i) => i + 1).map(id => (
                  <div key={id} className="vote-item">
                    <span className={`vote-player ${id === quickLeader ? 'leader' : ''}`}>
                      {id}号{id === quickLeader ? '👑' : ''}
                    </span>
                    <div className="vote-buttons">
                      <button
                        className={`vote-btn approve ${votes[id] === true ? 'active' : ''}`}
                        onClick={() => setVote(id, true)}
                        title="赞成"
                      >
                        👍
                      </button>
                      <button
                        className={`vote-btn reject ${votes[id] === false ? 'active' : ''}`}
                        onClick={() => setVote(id, false)}
                        title="反对"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 组队是否通过 */}
            <div className="quick-section">
              <label className="section-label">3. 组队结果</label>
              <div className="result-buttons">
                <button
                  className={`result-btn success ${teamApproved === true ? 'selected' : ''}`}
                  onClick={() => setTeamApproved(true)}
                >
                  ✅ 通过
                </button>
                <button
                  className={`result-btn fail ${teamApproved === false ? 'selected' : ''}`}
                  onClick={() => setTeamApproved(false)}
                >
                  ❌ 否决
                </button>
              </div>
              {teamApproved === null && (
                <p className="hint-text">👆 请选择组队是否通过</p>
              )}
            </div>

            {/* 选择队伍（仅组队通过时显示） */}
            {teamApproved === true && (
              <>
                <div className="quick-section highlight-section">
                  <label className="section-label">4. 增加队伍成员（点击选择）</label>
                  <div className="player-chips">
                    {Array.from({ length: playerCount }, (_, i) => i + 1).map(id => (
                      <button
                        key={id}
                        className={`player-chip ${quickTeam.includes(id) ? 'selected' : ''}`}
                        onClick={() => toggleTeamMember(id)}
                      >
                        {id}号
                      </button>
                    ))}
                  </div>
                  {quickTeam.length > 0 && (
                    <p className="selected-hint">
                      已选择：{quickTeam.map(id => `${id}号`).join('、')}
                    </p>
                  )}
                </div>

                <div className="quick-section">
                  <label className="section-label">5. 任务结果</label>
                  <div className="result-buttons">
                    <button
                      className={`result-btn success ${quickResult === 'success' ? 'selected' : ''}`}
                      onClick={() => setQuickResult('success')}
                    >
                      ✅ 成功
                    </button>
                    <button
                      className={`result-btn fail ${quickResult === 'fail' ? 'selected' : ''}`}
                      onClick={() => setQuickResult('fail')}
                    >
                      ❌ 失败
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 否决时的提示 */}
            {teamApproved === false && (
              <div className="quick-section reject-hint">
                <p>🚫 组队被否决，无需选择队伍成员和任务结果</p>
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={handleQuickAddMission}>
              ➕ 记录第 {missions.length + 1} 轮
            </button>
          </div>

          {/* ========== 发言快速录入 ========== */}
          <div className="input-section-card">
            <h3>💬 记录发言（第 {suggestedRound} 轮）</h3>
            <div className="round-select">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  className={`round-btn ${speechRound === r ? 'active' : ''}`}
                  onClick={() => setSpeechRound(r)}
                >
                  R{r}
                </button>
              ))}
            </div>
            <textarea
              className="input-textarea compact"
              placeholder="粘贴发言记录...&#10;支持格式：1号：xxx  或  玩家1：xxx"
              value={speechText}
              onChange={e => setSpeechText(e.target.value)}
              rows={4}
            />
            <button className="btn btn-primary btn-full" onClick={handleParseSpeech}>
              📝 解析发言
            </button>
          </div>
        </div>
      ) : (
        <div className="detailed-input-panel">
          <div className="input-section-card">
            <h3>💬 发言记录</h3>
            <div className="input-row">
              <label>
                轮次：
                <select
                  value={speechRound}
                  onChange={e => setSpeechRound(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map(r => (
                    <option key={r} value={r}>
                      第 {r} 轮
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              className="input-textarea"
              placeholder="在这里粘贴发言记录..."
              value={speechText}
              onChange={e => setSpeechText(e.target.value)}
              rows={8}
            />
            <button className="btn btn-primary" onClick={handleParseSpeech}>
              📝 解析发言
            </button>
          </div>
        </div>
      )}

      {/* 解析结果提示 */}
      {parseResult && (
        <div className={`parse-result ${parseResult.includes('⚠️') ? 'warning' : ''}`}>
          {parseResult}
        </div>
      )}

      {/* 已录入数据概览 */}
      <div className="data-overview">
        <div className="overview-header">
          <h3>📊 已录入数据</h3>
        </div>
        <div className="overview-stats">
          <div className="stat">
            <span className="stat-number">{stances.length}</span>
            <span className="stat-label">立场关系</span>
          </div>
          <div className="stat">
            <span className="stat-number">{missions.length}</span>
            <span className="stat-label">任务轮次</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {missions.filter(m => m.teamApproved).length}
            </span>
            <span className="stat-label">通过</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {missions.filter(m => !m.teamApproved).length}
            </span>
            <span className="stat-label">否决</span>
          </div>
        </div>

        {/* 任务结果概览 */}
        {missions.length > 0 && (
          <div className="mission-overview">
            {missions.map((m, idx) => (
              <div
                key={idx}
                className={`mission-dot ${
                  !m.teamApproved
                    ? 'rejected'
                    : m.result === 'success'
                      ? 'success'
                      : m.result === 'fail'
                        ? 'fail'
                        : 'pending'
                }`}
                title={
                  !m.teamApproved
                    ? `第${m.round}轮：组队被否决`
                    : `第${m.round}轮：任务${m.result === 'success' ? '成功' : '失败'}`
                }
              >
                {!m.teamApproved ? '🚫' : m.result === 'success' ? '✅' : '❌'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
