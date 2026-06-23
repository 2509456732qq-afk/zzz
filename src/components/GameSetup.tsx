import { useGameStore } from '../store/gameStore';

export function GameSetup() {
  const { playerCount, setPlayerCount, initGame } = useGameStore();

  const playerOptions = [5, 6, 7, 8, 9, 10];

  return (
    <div className="game-setup">
      <div className="setup-card">
        <h2>🎮 游戏配置</h2>
        <p className="setup-desc">选择本局游戏的玩家人数</p>

        <div className="player-count-grid">
          {playerOptions.map(count => (
            <button
              key={count}
              className={`count-btn ${playerCount === count ? 'selected' : ''}`}
              onClick={() => setPlayerCount(count)}
            >
              <span className="count-number">{count}</span>
              <span className="count-label">人局</span>
            </button>
          ))}
        </div>

        <div className="config-preview">
          <p>
            <strong>邪恶方：</strong>
            {playerCount <= 6 ? '2' : playerCount <= 9 ? '3' : '4'} 人
          </p>
          <p>
            <strong>任务轮次：</strong>5 轮
          </p>
          {playerCount >= 7 && (
            <p className="note">※ 第 4 轮需要 2 张失败票才算任务失败</p>
          )}
        </div>

        <button className="btn btn-primary btn-large" onClick={initGame}>
          🚀 开始游戏
        </button>
      </div>
    </div>
  );
}
