import type {
  PlayerId,
  GameConfig,
  MissionRecord,
  StanceRelation,
} from '../types';

// ==================== 蒙特卡洛模拟 ====================

/**
 * 生成所有可能的 C(n, k) 组合
 */
function combinations(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];

  const result: number[][] = [];
  const [first, ...rest] = arr;

  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }

  for (const combo of combinations(rest, k)) {
    result.push(combo);
  }

  return result;
}

/**
 * 计算某个阵营分配与已观察证据的吻合度
 */
function calculateWeight(
  assignment: Set<PlayerId>,
  missions: MissionRecord[],
  stances: StanceRelation[],
  config: GameConfig
): number {
  let weight = 1.0;

  for (const mission of missions) {
    if (!mission.teamApproved || !mission.result) continue;

    const evilInTeam = mission.team.filter(id => assignment.has(id)).length;
    const expectedTeamSize = config.missionSizes[mission.round - 1] || mission.team.length;

    if (mission.team.length !== expectedTeamSize) {
      weight *= 0.8;
    }

    if (mission.result === 'fail') {
      if (evilInTeam === 0) {
        weight *= 0.1;
      } else {
        const failCount = mission.missionVotes?.filter(v => !v.success).length ?? 1;
        const isDoubleFailRound = config.doubleFailRounds.includes(mission.round);

        if (isDoubleFailRound) {
          if (failCount >= 2 && evilInTeam >= 2) {
            weight *= 1 + evilInTeam * 0.3;
          } else if (failCount >= 2 && evilInTeam < 2) {
            weight *= 0.5;
          }
        } else {
          if (failCount <= evilInTeam) {
            weight *= 1 + evilInTeam * 0.3;
          } else {
            weight *= 0.5;
          }
        }
      }
    } else {
      if (evilInTeam === 0) {
        weight *= 1.2;
      } else {
        weight *= 0.8;
      }
    }
  }

  for (const mission of missions) {
    if (!mission.teamVotes) continue;

    for (const vote of mission.teamVotes) {
      const voterIsEvil = assignment.has(vote.voter);
      const teamHasEvil = mission.team.some(id => assignment.has(id));

      if (voterIsEvil) {
        if (teamHasEvil && vote.approve) {
          weight *= 1.1;
        } else if (!teamHasEvil && !vote.approve) {
          weight *= 1.1;
        } else {
          weight *= 0.9;
        }
      } else {
        if (teamHasEvil && !vote.approve) {
          weight *= 1.1;
        } else if (teamHasEvil && vote.approve) {
          weight *= 0.9;
        }
      }
    }
  }

  for (const stance of stances) {
    const fromIsEvil = assignment.has(stance.from);
    const toIsEvil = assignment.has(stance.to);

    if (stance.stance === 'support') {
      if (fromIsEvil === toIsEvil) {
        weight *= 1 + stance.confidence * 0.2;
      } else {
        if (fromIsEvil) {
          weight *= 1 + stance.confidence * 0.1;
        } else {
          weight *= 1 - stance.confidence * 0.15;
        }
      }
    } else if (stance.stance === 'oppose') {
      if (fromIsEvil === toIsEvil) {
        weight *= 1 - stance.confidence * 0.2;
      } else {
        weight *= 1 + stance.confidence * 0.1;
      }
    }
  }

  return Math.max(0.001, weight);
}

/**
 * 蒙特卡洛模拟
 */
export function monteCarloSimulation(
  config: GameConfig,
  missions: MissionRecord[],
  stances: StanceRelation[],
  sampleSize: number = 5000
): Map<PlayerId, number> {
  const allPlayers = Array.from({ length: config.totalPlayers }, (_, i) => i + 1);

  const evilCombinations = combinations(allPlayers, config.evilCount);

  if (evilCombinations.length === 0) {
    const probs = new Map<PlayerId, number>();
    const baseProb = config.evilCount / config.totalPlayers;
    for (const id of allPlayers) {
      probs.set(id, baseProb);
    }
    return probs;
  }

  let sampledCombos: number[][];
  if (evilCombinations.length <= sampleSize) {
    sampledCombos = evilCombinations;
  } else {
    sampledCombos = [];
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * evilCombinations.length));
    }
    for (const idx of indices) {
      sampledCombos.push(evilCombinations[idx]);
    }
  }

  const weights: { assignment: Set<PlayerId>; weight: number }[] = [];
  let totalWeight = 0;

  for (const combo of sampledCombos) {
    const assignment = new Set(combo);
    const weight = calculateWeight(assignment, missions, stances, config);
    weights.push({ assignment, weight });
    totalWeight += weight;
  }

  const evilCounts = new Map<PlayerId, number>();
  for (const id of allPlayers) {
    evilCounts.set(id, 0);
  }

  for (const { assignment, weight } of weights) {
    const normalizedWeight = weight / totalWeight;
    for (const id of assignment) {
      evilCounts.set(id, (evilCounts.get(id) ?? 0) + normalizedWeight);
    }
  }

  return evilCounts;
}
