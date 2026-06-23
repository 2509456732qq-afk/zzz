import type {
  PlayerId,
  MissionRecord,
  GameConfig,
  StanceRelation,
} from '../types';

// ==================== 投票模式分析 ====================

/** 投票统计 */
export interface VoteStats {
  totalVotes: number;
  approveCount: number;
  rejectCount: number;
  approveRate: number;
  rejectRate: number;
}

/**
 * 获取单个玩家的投票统计
 */
export function getPlayerVoteStats(
  playerId: PlayerId,
  missions: MissionRecord[]
): VoteStats {
  let totalVotes = 0;
  let approveCount = 0;
  let rejectCount = 0;

  for (const mission of missions) {
    if (!mission.teamVotes) continue;
    for (const vote of mission.teamVotes) {
      if (vote.voter === playerId) {
        totalVotes++;
        if (vote.approve) {
          approveCount++;
        } else {
          rejectCount++;
        }
      }
    }
  }

  return {
    totalVotes,
    approveCount,
    rejectCount,
    approveRate: totalVotes > 0 ? approveCount / totalVotes : 0,
    rejectRate: totalVotes > 0 ? rejectCount / totalVotes : 0,
  };
}

/**
 * 检测异常投票模式
 */
export function detectAnomalies(
  missions: MissionRecord[],
  config: GameConfig
): { playerId: PlayerId; anomaly: string; severity: number }[] {
  const anomalies: { playerId: PlayerId; anomaly: string; severity: number }[] = [];

  for (let i = 1; i <= config.totalPlayers; i++) {
    const stats = getPlayerVoteStats(i, missions);

    if (stats.totalVotes >= 3 && stats.rejectRate === 0) {
      anomalies.push({
        playerId: i,
        anomaly: '从未否决任何队伍',
        severity: 0.6,
      });
    }

    if (stats.totalVotes >= 3 && stats.approveRate === 0) {
      anomalies.push({
        playerId: i,
        anomaly: '从未赞成任何队伍',
        severity: 0.5,
      });
    }

    let approvedAndFailed = 0;
    let totalApproved = 0;
    for (const mission of missions) {
      if (!mission.teamVotes || !mission.teamApproved) continue;
      const vote = mission.teamVotes.find(v => v.voter === i);
      if (vote?.approve) {
        totalApproved++;
        if (mission.result === 'fail') {
          approvedAndFailed++;
        }
      }
    }
    if (totalApproved >= 2 && approvedAndFailed / totalApproved > 0.7) {
      anomalies.push({
        playerId: i,
        anomaly: `赞成的任务失败率高达${Math.round(approvedAndFailed / totalApproved * 100)}%`,
        severity: 0.8,
      });
    }
  }

  return anomalies.sort((a, b) => b.severity - a.severity);
}

/**
 * 计算立场一致性
 */
export function calculateConsistency(
  playerId: PlayerId,
  stances: StanceRelation[],
  _config: GameConfig
): number {
  const playerStances = stances.filter(s => s.from === playerId);
  if (playerStances.length === 0) return 1;

  const byTarget = new Map<PlayerId, StanceRelation[]>();
  for (const stance of playerStances) {
    const list = byTarget.get(stance.to) ?? [];
    list.push(stance);
    byTarget.set(stance.to, list);
  }

  let totalConsistency = 0;
  let targetCount = 0;

  for (const [, targetStances] of byTarget) {
    if (targetStances.length < 2) continue;

    targetCount++;
    let consistentPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < targetStances.length; i++) {
      for (let j = i + 1; j < targetStances.length; j++) {
        totalPairs++;
        if (targetStances[i].stance === targetStances[j].stance) {
          consistentPairs++;
        }
      }
    }

    if (totalPairs > 0) {
      totalConsistency += consistentPairs / totalPairs;
    }
  }

  return targetCount > 0 ? totalConsistency / targetCount : 1;
}

/**
 * 检测抱团现象
 */
export function detectCliques(
  stances: StanceRelation[],
  config: GameConfig
): { members: PlayerId[]; strength: number }[] {
  const supportGraph = new Map<PlayerId, Set<PlayerId>>();
  for (let i = 1; i <= config.totalPlayers; i++) {
    supportGraph.set(i, new Set());
  }

  for (const stance of stances) {
    if (stance.stance === 'support' && stance.confidence > 0.5) {
      supportGraph.get(stance.from)?.add(stance.to);
    }
  }

  const mutualSupport: Set<string> = new Set();
  for (let i = 1; i <= config.totalPlayers; i++) {
    for (let j = i + 1; j <= config.totalPlayers; j++) {
      if (supportGraph.get(i)?.has(j) && supportGraph.get(j)?.has(i)) {
        mutualSupport.add(`${i}-${j}`);
      }
    }
  }

  const cliques: { members: PlayerId[]; strength: number }[] = [];
  for (let i = 1; i <= config.totalPlayers; i++) {
    for (let j = i + 1; j <= config.totalPlayers; j++) {
      for (let k = j + 1; k <= config.totalPlayers; k++) {
        const ij = mutualSupport.has(`${i}-${j}`);
        const ik = mutualSupport.has(`${i}-${k}`);
        const jk = mutualSupport.has(`${j}-${k}`);
        if (ij && ik && jk) {
          cliques.push({ members: [i, j, k], strength: 0.9 });
        } else if ((ij && ik) || (ij && jk) || (ik && jk)) {
          cliques.push({ members: [i, j, k], strength: 0.6 });
        }
      }
    }
  }

  return cliques.sort((a, b) => b.strength - a.strength);
}
