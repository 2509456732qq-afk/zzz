// ==================== 基础类型 ====================

/** 玩家编号（从 1 开始） */
export type PlayerId = number;

/** 阵营 */
export type Team = 'good' | 'evil';

/** 立场类型 */
export type StanceType = 'support' | 'oppose' | 'neutral';

/** 任务结果 */
export type MissionResult = 'success' | 'fail';

// ==================== 游戏配置 ====================

/** 游戏人数配置 */
export interface GameConfig {
  totalPlayers: number;
  evilCount: number;
  missionSizes: number[];       // 每轮任务需要的人数
  doubleFailRounds: number[];   // 需要两张失败牌的轮次（通常是第 4 轮 7+ 人）
}

/** 标准游戏配置 */
export const GAME_CONFIGS: Record<number, GameConfig> = {
  5:  { totalPlayers: 5,  evilCount: 2, missionSizes: [2, 3, 2, 3, 3], doubleFailRounds: [] },
  6:  { totalPlayers: 6,  evilCount: 2, missionSizes: [2, 3, 4, 3, 4], doubleFailRounds: [] },
  7:  { totalPlayers: 7,  evilCount: 3, missionSizes: [2, 3, 3, 4, 4], doubleFailRounds: [4] },
  8:  { totalPlayers: 8,  evilCount: 3, missionSizes: [3, 4, 4, 5, 5], doubleFailRounds: [4] },
  9:  { totalPlayers: 9,  evilCount: 3, missionSizes: [3, 4, 4, 5, 5], doubleFailRounds: [4] },
  10: { totalPlayers: 10, evilCount: 4, missionSizes: [3, 4, 4, 5, 5], doubleFailRounds: [4] },
};

// ==================== 玩家数据 ====================

/** 玩家信息 */
export interface Player {
  id: PlayerId;
  name: string;
  evilProbability: number;   // 0~1，邪恶方概率
  evidence: Evidence[];      // 累积的证据
}

/** 证据类型 */
export type EvidenceType =
  | 'mission_fail'        // 参与的任务失败了
  | 'mission_success'     // 参与的任务成功了
  | 'voted_approve'       // 投票赞成了一支队伍
  | 'voted_reject'        // 投票否决了一支队伍
  | 'speech_support'      // 发言支持某人
  | 'speech_oppose'       // 发言反对某人
  | 'protected_evil'      // 保护了已确认的坏人
  | 'attacked_good'       // 攻击了已确认的好人
  ;

/** 证据记录 */
export interface Evidence {
  type: EvidenceType;
  round: number;            // 第几轮
  description: string;      // 人类可读描述
  weight: number;           // 权重（对概率的影响程度）
  relatedPlayers: PlayerId[]; // 相关玩家
}

// ==================== 发言解析 ====================

/** 立场关系（解析结果） */
export interface StanceRelation {
  from: PlayerId;           // 发言者
  to: PlayerId;             // 目标玩家
  stance: StanceType;
  confidence: number;       // 0~1 置信度
  evidence: string;         // 原文片段
  round: number;            // 第几轮
}

/** 发言记录 */
export interface SpeechRecord {
  speaker: PlayerId;
  content: string;
  round: number;
  timestamp?: string;       // 可选时间戳
}

// ==================== 投票数据 ====================

/** 单次投票 */
export interface Vote {
  voter: PlayerId;          // 投票者
  approve: boolean;         // true=赞成，false=反对
}

/** 任务投票（执行任务时的秘密投票） */
export interface MissionVote {
  voter: PlayerId;
  success: boolean;         // true=成功，false=失败
}

/** 一轮任务的完整记录 */
export interface MissionRecord {
  round: number;
  leader: PlayerId;         // 队长
  team: PlayerId[];         // 队伍成员
  teamVotes: Vote[];        // 组队投票
  teamApproved: boolean;    // 组队是否通过
  missionVotes?: MissionVote[]; // 任务投票（仅通过时有）
  result?: MissionResult;   // 任务结果（仅通过时有）
}

// ==================== 已知身份 ====================

/** 已知身份信息 */
export interface KnownIdentity {
  playerId: PlayerId;
  team: Team;  // 'good' 或 'evil'
  revealedRound: number;  // 第几轮揭示的
}

// ==================== 分析结果 ====================

/** 玩家分析摘要 */
export interface PlayerAnalysis {
  player: Player;
  evilProbability: number;
  stanceVector: Record<PlayerId, StanceType>;  // 对其他人的立场
  consistencyScore: number;  // 立场一致性评分 0~1
  keyEvidence: Evidence[];   // 关键证据
}

/** 游戏分析总览 */
export interface GameAnalysis {
  players: PlayerAnalysis[];
  stanceMatrix: StanceRelation[][];
  missionHistory: MissionRecord[];
  overallConfidence: number; // 分析的整体可信度
}

// ==================== 蒙特卡洛 ====================

/** 一种可能的阵营分配 */
export interface FactionAssignment {
  evilPlayers: Set<PlayerId>;
  weight: number;           // 与证据的吻合度权重
}
