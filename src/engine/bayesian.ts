import type {
  PlayerId,
  GameConfig,
  StanceRelation,
  MissionRecord,
  Evidence,
  EvidenceType,
} from '../types';

// ==================== 贝叶斯推断引擎 ====================

/**
 * 初始化先验概率
 * 所有玩家等概率为邪恶方
 */
export function initializePriors(config: GameConfig): Map<PlayerId, number> {
  const priors = new Map<PlayerId, number>();
  const evilProb = config.evilCount / config.totalPlayers;

  for (let i = 1; i <= config.totalPlayers; i++) {
    priors.set(i, evilProb);
  }

  return priors;
}

/**
 * 归一化概率，使邪恶方概率之和等于邪恶方人数
 */
export function normalizeProbabilities(
  probs: Map<PlayerId, number>,
  evilCount: number
): Map<PlayerId, number> {
  const totalEvil = Array.from(probs.values()).reduce((sum, p) => sum + p, 0);

  if (totalEvil === 0) return probs;

  const normalized = new Map<PlayerId, number>();
  const scale = evilCount / totalEvil;

  for (const [id, prob] of probs) {
    normalized.set(id, Math.min(0.95, Math.max(0.05, prob * scale)));
  }

  return normalized;
}

/**
 * 根据任务结果更新概率
 */
export function updateByMissionResult(
  probs: Map<PlayerId, number>,
  mission: MissionRecord,
  config: GameConfig
): Map<PlayerId, number> {
  const updated = new Map(probs);

  if (!mission.result || !mission.teamApproved) return updated;

  if (mission.result === 'fail') {
    const failCount = mission.missionVotes?.filter(v => !v.success).length ?? 1;
    const teamSize = mission.team.length;
    const boostFactor = 1 + (failCount / teamSize) * 0.5;

    for (const memberId of mission.team) {
      const current = updated.get(memberId) ?? 0.5;
      updated.set(memberId, Math.min(0.95, current * boostFactor));
    }

    const nonTeamBoost = 1 - (failCount / (config.totalPlayers - teamSize)) * 0.2;
    for (let i = 1; i <= config.totalPlayers; i++) {
      if (!mission.team.includes(i)) {
        const current = updated.get(i) ?? 0.5;
        updated.set(i, Math.max(0.05, current * nonTeamBoost));
      }
    }
  } else {
    const successBoost = 0.9;
    for (const memberId of mission.team) {
      const current = updated.get(memberId) ?? 0.5;
      updated.set(memberId, Math.max(0.05, current * successBoost));
    }
  }

  return normalizeProbabilities(updated, config.evilCount);
}

/**
 * 根据投票模式更新概率
 */
export function updateByVotingPattern(
  probs: Map<PlayerId, number>,
  missions: MissionRecord[],
  config: GameConfig
): Map<PlayerId, number> {
  const updated = new Map(probs);

  const rejectCounts = new Map<PlayerId, number>();
  const totalVotes = new Map<PlayerId, number>();

  for (let i = 1; i <= config.totalPlayers; i++) {
    rejectCounts.set(i, 0);
    totalVotes.set(i, 0);
  }

  for (const mission of missions) {
    if (!mission.teamVotes) continue;
    for (const vote of mission.teamVotes) {
      const total = (totalVotes.get(vote.voter) ?? 0) + 1;
      totalVotes.set(vote.voter, total);
      if (!vote.approve) {
        rejectCounts.set(vote.voter, (rejectCounts.get(vote.voter) ?? 0) + 1);
      }
    }
  }

  for (let i = 1; i <= config.totalPlayers; i++) {
    const total = totalVotes.get(i) ?? 0;
    if (total === 0) continue;

    const rejectRate = (rejectCounts.get(i) ?? 0) / total;
    const current = updated.get(i) ?? 0.5;

    if (rejectRate > 0.6) {
      updated.set(i, Math.max(0.05, current * 0.85));
    } else if (rejectRate < 0.3 && total >= 2) {
      updated.set(i, Math.min(0.95, current * 1.15));
    }
  }

  return normalizeProbabilities(updated, config.evilCount);
}

/**
 * 根据发言立场更新概率
 */
export function updateByStance(
  probs: Map<PlayerId, number>,
  stances: StanceRelation[],
  config: GameConfig
): Map<PlayerId, number> {
  const updated = new Map(probs);

  for (const stance of stances) {
    const fromProb = updated.get(stance.from) ?? 0.5;
    const toProb = updated.get(stance.to) ?? 0.5;

    if (stance.stance === 'support') {
      if (toProb > 0.6) {
        const boost = (toProb - 0.5) * stance.confidence * 0.3;
        updated.set(stance.from, Math.min(0.95, fromProb + boost));
      }
    } else if (stance.stance === 'oppose') {
      if (toProb < 0.4) {
        const boost = (0.5 - toProb) * stance.confidence * 0.2;
        updated.set(stance.from, Math.min(0.95, fromProb + boost));
      }
      if (toProb > 0.6) {
        const reduction = (toProb - 0.5) * stance.confidence * 0.2;
        updated.set(stance.from, Math.max(0.05, fromProb - reduction));
      }
    }
  }

  return normalizeProbabilities(updated, config.evilCount);
}

/**
 * 生成证据记录
 */
export function generateEvidence(
  type: EvidenceType,
  round: number,
  description: string,
  weight: number,
  relatedPlayers: PlayerId[]
): Evidence {
  return { type, round, description, weight, relatedPlayers };
}

/**
 * 综合贝叶斯推断
 */
export function bayesianInference(
  config: GameConfig,
  missions: MissionRecord[],
  stances: StanceRelation[]
): { probabilities: Map<PlayerId, number>; evidence: Map<PlayerId, Evidence[]> } {
  let probs = initializePriors(config);
  const evidenceMap = new Map<PlayerId, Evidence[]>();

  for (let i = 1; i <= config.totalPlayers; i++) {
    evidenceMap.set(i, []);
  }

  for (const mission of missions) {
    if (mission.teamApproved && mission.result) {
      probs = updateByMissionResult(probs, mission, config);

      for (const memberId of mission.team) {
        const ev = generateEvidence(
          mission.result === 'fail' ? 'mission_fail' : 'mission_success',
          mission.round,
          `第${mission.round}轮任务${mission.result === 'fail' ? '失败' : '成功'}，${memberId}号在队伍中`,
          mission.result === 'fail' ? 0.7 : 0.3,
          [memberId]
        );
        evidenceMap.get(memberId)?.push(ev);
      }
    }
  }

  probs = updateByVotingPattern(probs, missions, config);
  probs = updateByStance(probs, stances, config);
  probs = normalizeProbabilities(probs, config.evilCount);

  return { probabilities: probs, evidence: evidenceMap };
}
