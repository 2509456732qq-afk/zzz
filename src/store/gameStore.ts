import { create } from 'zustand';
import type {
  PlayerId,
  GameConfig,
  Player,
  StanceRelation,
  MissionRecord,
  Evidence,
  KnownIdentity,
} from '../types';
import { GAME_CONFIGS } from '../types';
import { parseSpeeches } from '../parser/speechParser';
import { bayesianInference } from '../engine/bayesian';
import { monteCarloSimulation } from '../engine/monteCarlo';

// ==================== 状态类型 ====================

interface GameState {
  // 游戏配置
  playerCount: number;
  config: GameConfig | null;
  players: Player[];

  // 数据
  stances: StanceRelation[];
  missions: MissionRecord[];
  knownIdentities: KnownIdentity[];  // 已知身份

  // 分析结果
  probabilities: Map<PlayerId, number>;
  evidence: Map<PlayerId, Evidence[]>;

  // UI 状态
  currentRound: number;
  isAnalyzing: boolean;

  // Actions
  setPlayerCount: (count: number) => void;
  initGame: () => void;
  parseSpeech: (text: string, round: number) => void;
  addMission: (mission: MissionRecord) => void;
  addKnownIdentity: (identity: KnownIdentity) => void;
  removeKnownIdentity: (playerId: PlayerId) => void;
  analyze: () => void;
  reset: () => void;
}

// ==================== Store ====================

export const useGameStore = create<GameState>((set, get) => ({
  // 初始状态
  playerCount: 6,
  config: null,
  players: [],
  stances: [],
  missions: [],
  knownIdentities: [],
  probabilities: new Map(),
  evidence: new Map(),
  currentRound: 1,
  isAnalyzing: false,

  // 设置玩家人数
  setPlayerCount: (count: number) => {
    set({ playerCount: count });
  },

  // 初始化游戏
  initGame: () => {
    const { playerCount } = get();
    const config = GAME_CONFIGS[playerCount];
    if (!config) return;

    const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      name: `${i + 1}号`,
      evilProbability: config.evilCount / playerCount,
      evidence: [],
    }));

    set({
      config,
      players,
      stances: [],
      missions: [],
      probabilities: new Map(),
      evidence: new Map(),
      currentRound: 1,
    });
  },

  // 解析发言
  parseSpeech: (text: string, round: number) => {
    const { playerCount, stances } = get();
    const { relations } = parseSpeeches(text, playerCount, round);

    set({
      stances: [...stances, ...relations],
      currentRound: round,
    });
  },

  // 添加任务记录
  addMission: (mission: MissionRecord) => {
    const { missions } = get();
    set({
      missions: [...missions, mission],
      currentRound: mission.round + 1,
    });
  },

  // 添加已知身份
  addKnownIdentity: (identity: KnownIdentity) => {
    const { knownIdentities } = get();
    // 检查是否已经存在该玩家的身份
    const exists = knownIdentities.some(k => k.playerId === identity.playerId);
    if (exists) {
      // 更新已存在的身份
      set({
        knownIdentities: knownIdentities.map(k =>
          k.playerId === identity.playerId ? identity : k
        ),
      });
    } else {
      // 最多只能有2个已知身份
      if (knownIdentities.length >= 2) {
        return; // 超过限制，不添加
      }
      set({
        knownIdentities: [...knownIdentities, identity],
      });
    }
  },

  // 移除已知身份
  removeKnownIdentity: (playerId: PlayerId) => {
    const { knownIdentities } = get();
    set({
      knownIdentities: knownIdentities.filter(k => k.playerId !== playerId),
    });
  },

  // 执行分析
  analyze: () => {
    const { config, missions, stances, knownIdentities } = get();
    if (!config) return;

    set({ isAnalyzing: true });

    // 贝叶斯推断
    const bayesianResult = bayesianInference(config, missions, stances);

    // 蒙特卡洛模拟
    const mcResult = monteCarloSimulation(config, missions, stances, 5000);

    // 合并两种方法的结果（加权平均）
    const combinedProbs = new Map<PlayerId, number>();
    for (let i = 1; i <= config.totalPlayers; i++) {
      const bayesianProb = bayesianResult.probabilities.get(i) ?? 0.5;
      const mcProb = mcResult.get(i) ?? 0.5;
      // 贝叶斯权重 0.4，蒙特卡洛权重 0.6
      combinedProbs.set(i, bayesianProb * 0.4 + mcProb * 0.6);
    }

    // 应用已知身份信息
    for (const identity of knownIdentities) {
      if (identity.team === 'good') {
        // 已知是好人，设置为极低邪恶概率
        combinedProbs.set(identity.playerId, 0.05);
      } else if (identity.team === 'evil') {
        // 已知是坏人，设置为极高邪恶概率
        combinedProbs.set(identity.playerId, 0.95);
      }
    }

    // 基于已知身份调整其他玩家的概率
    if (knownIdentities.length > 0) {
      const knownEvilCount = knownIdentities.filter(k => k.team === 'evil').length;
      const remainingEvil = config.evilCount - knownEvilCount;
      const remainingPlayers = config.totalPlayers - knownIdentities.length;

      if (remainingPlayers > 0 && remainingEvil > 0) {
        const baseEvilProb = remainingEvil / remainingPlayers;

        // 与已知坏人关系密切的玩家，邪恶概率上升
        // 与已知好人关系密切的玩家，邪恶概率下降
        for (const stance of stances) {
          const fromKnown = knownIdentities.find(k => k.playerId === stance.from);
          const toKnown = knownIdentities.find(k => k.playerId === stance.to);

          if (fromKnown && !toKnown) {
            const currentProb = combinedProbs.get(stance.to) ?? baseEvilProb;
            if (fromKnown.team === 'evil' && stance.stance === 'support') {
              // 坏人保的人更可疑
              combinedProbs.set(stance.to, Math.min(0.9, currentProb + 0.15));
            } else if (fromKnown.team === 'good' && stance.stance === 'support') {
              // 好人保的人更可信
              combinedProbs.set(stance.to, Math.max(0.1, currentProb - 0.15));
            }
          }

          if (toKnown && !fromKnown) {
            const currentProb = combinedProbs.get(stance.from) ?? baseEvilProb;
            if (toKnown.team === 'evil' && stance.stance === 'support') {
              // 保坏人的人更可疑
              combinedProbs.set(stance.from, Math.min(0.9, currentProb + 0.1));
            } else if (toKnown.team === 'good' && stance.stance === 'oppose') {
              // 踩好人的人更可疑
              combinedProbs.set(stance.from, Math.min(0.9, currentProb + 0.1));
            }
          }
        }

        // 重新归一化，确保邪恶方概率之和等于邪恶方人数
        const unknownPlayers = Array.from(combinedProbs.entries())
          .filter(([id]) => !knownIdentities.some(k => k.playerId === id));

        const currentEvilSum = unknownPlayers.reduce((sum, [_, prob]) => sum + prob, 0);
        if (currentEvilSum > 0) {
          const scale = remainingEvil / currentEvilSum;
          for (const [id, prob] of unknownPlayers) {
            combinedProbs.set(id, Math.max(0.05, Math.min(0.95, prob * scale)));
          }
        }
      }
    }

    // 更新玩家信息
    const { players } = get();
    const updatedPlayers = players.map(p => ({
      ...p,
      evilProbability: combinedProbs.get(p.id) ?? 0.5,
      evidence: bayesianResult.evidence.get(p.id) ?? [],
    }));

    set({
      probabilities: combinedProbs,
      evidence: bayesianResult.evidence,
      players: updatedPlayers,
      isAnalyzing: false,
    });
  },

  // 重置
  reset: () => {
    set({
      config: null,
      players: [],
      stances: [],
      missions: [],
      probabilities: new Map(),
      evidence: new Map(),
      currentRound: 1,
      isAnalyzing: false,
    });
  },
}));
