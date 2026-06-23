import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import { GameSetup } from './components/GameSetup';
import { InputPanel } from './components/InputPanel';
import { ProbabilityDashboard } from './components/ProbabilityDashboard';
import { StanceHeatmap } from './components/StanceHeatmap';
import { VoteTimeline } from './components/VoteTimeline';
import { RelationGraph } from './components/RelationGraph';
import './App.css';

function App() {
  const { players, missions, isAnalyzing, analyze, reset } = useGameStore();
  const [activeTab, setActiveTab] = useState<'input' | 'analysis'>('input');

  const hasData = players.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏰 阿瓦隆桌游分析工具</h1>
        <p className="subtitle">解析发言 · 追踪投票 · 推演阵营</p>
      </header>

      {!hasData ? (
        <GameSetup />
      ) : (
        <div className="app-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              📝 数据录入
            </button>
            <button
              className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              📊 分析结果
            </button>
          </div>

          {activeTab === 'input' ? (
            <div className="input-section">
              <InputPanel />

              {/* 已录入任务列表 */}
              {missions.length > 0 && (
                <div className="mission-records">
                  <h3>📋 已录入的任务记录</h3>
                  <div className="mission-list">
                    {missions.map((mission, idx) => (
                      <div
                        key={idx}
                        className={`mission-record ${
                          !mission.teamApproved
                            ? 'rejected'
                            : mission.result || 'pending'
                        }`}
                      >
                        <div className="mission-record-header">
                          <span className="mission-round">第 {mission.round} 轮</span>
                          <span className="mission-status">
                            {!mission.teamApproved
                              ? '🚫 否决'
                              : mission.result === 'success'
                                ? '✅ 成功'
                                : '❌ 失败'}
                          </span>
                        </div>
                        <div className="mission-record-body">
                          <div className="record-item">
                            <span className="record-label">队长：</span>
                            <span className="record-value">{mission.leader}号 👑</span>
                          </div>
                          {mission.team.length > 0 && (
                            <div className="record-item">
                              <span className="record-label">队伍：</span>
                              <div className="record-team">
                                {mission.team.map(id => (
                                  <span
                                    key={id}
                                    className={`team-tag ${id === mission.leader ? 'leader' : ''}`}
                                  >
                                    {id}号
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {mission.teamVotes.length > 0 && (
                            <div className="record-item">
                              <span className="record-label">投票：</span>
                              <span className="record-value">
                                {mission.teamVotes.filter(v => v.approve).length}👍 /{' '}
                                {mission.teamVotes.filter(v => !v.approve).length}👎
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="action-bar">
                <button className="btn btn-primary" onClick={analyze} disabled={isAnalyzing}>
                  {isAnalyzing ? '分析中...' : '🔍 开始分析'}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                  🔄 重新开始
                </button>
              </div>
            </div>
          ) : (
            <div className="analysis-section">
              <div className="analysis-grid">
                <div className="card probability-card">
                  <h2>🎯 阵营概率</h2>
                  <ProbabilityDashboard />
                </div>
                <div className="card heatmap-card">
                  <h2>🔥 立场热力图</h2>
                  <StanceHeatmap />
                </div>
                <div className="card graph-card">
                  <h2>🕸️ 关系图谱</h2>
                  <RelationGraph />
                </div>
                <div className="card timeline-card">
                  <h2>📋 投票时间线</h2>
                  <VoteTimeline />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="app-footer">
        <p>阿瓦隆分析工具 · 仅供参考，请结合实际情况判断</p>
      </footer>
    </div>
  );
}

export default App;
