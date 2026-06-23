import type { PlayerId, StanceRelation, StanceType, SpeechRecord } from '../types';
import {
  SUPPORT_DICT,
  OPPOSE_DICT,
  NEUTRAL_DICT,
  INTENSITY_MODIFIERS,
  hasNegation,
  extractPlayerIds,
  NUMBER_MAP,
} from './dictionary';

// ==================== 文本预处理 ====================

/** 中文数字转阿拉伯数字 */
function normalizeNumbers(text: string): string {
  let result = text;
  for (const [cn, num] of Object.entries(NUMBER_MAP)) {
    if (cn.length === 1 && !/\d/.test(cn)) {
      result = result.replace(new RegExp(cn + '号', 'g'), `${num}号`);
    }
  }
  return result;
}

/** 清理噪声文本 */
function cleanText(text: string): string {
  return text
    .replace(/\[.*?\]/g, '')           // 去除方括号内容（时间戳等）
    .replace(/\d{2}:\d{2}:\d{2}/g, '') // 去除时间戳
    .replace(/\s+/g, ' ')              // 合并空白
    .trim();
}

// ==================== 发言分段 ====================

/** 发言记录的原始格式 */
interface RawSegment {
  speaker: string;
  content: string;
}

/**
 * 从原始文本中分段提取发言
 * 支持格式：
 *   "1号：xxx"
 *   "1号发言：xxx"
 *   "玩家1：xxx"
 *   "1号 说了：xxx"
 *   "[时间] 1号: xxx"
 */
export function segmentSpeeches(text: string): RawSegment[] {
  const cleaned = normalizeNumbers(cleanText(text));
  const segments: RawSegment[] = [];

  // 多种分隔符模式
  const patterns = [
    /(\d{1,2})\s*号\s*发言\s*[：:]\s*/g,
    /(\d{1,2})\s*号\s*玩家\s*[：:]\s*/g,
    /(\d{1,2})\s*号\s*说了\s*[：:]\s*/g,
    /(\d{1,2})\s*号\s*[：:]\s*/g,
    /玩家\s*(\d{1,2})\s*[：:]\s*/g,
    /P\s*(\d{1,2})\s*[：:]\s*/gi,
  ];

  // 用所有模式做全局匹配
  const matches: { pos: number; speaker: string; contentStart: number }[] = [];

  for (const pattern of patterns) {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(cleaned)) !== null) {
      matches.push({
        pos: m.index,
        speaker: m[1],
        contentStart: m.index + m[0].length,
      });
    }
  }

  // 按位置排序
  matches.sort((a, b) => a.pos - b.pos);

  // 去重（同一位置只保留第一个匹配）
  const uniqueMatches = matches.filter((m, i) => i === 0 || m.pos !== matches[i - 1].pos);

  // 提取发言内容
  for (let i = 0; i < uniqueMatches.length; i++) {
    const start = uniqueMatches[i].contentStart;
    const end = i + 1 < uniqueMatches.length ? uniqueMatches[i + 1].pos : cleaned.length;
    const content = cleaned.substring(start, end).trim();
    if (content) {
      segments.push({
        speaker: uniqueMatches[i].speaker,
        content,
      });
    }
  }

  // 如果没有匹配到任何模式，尝试按换行分割
  if (segments.length === 0) {
    const lines = cleaned.split(/\n/).filter(l => l.trim());
    for (const line of lines) {
      segments.push({ speaker: '?', content: line });
    }
  }

  return segments;
}

// ==================== 立场提取 ====================

/** 匹配结果 */
interface MatchResult {
  stance: StanceType;
  confidence: number;
  keyword: string;
  position: number;
}

/**
 * 在文本中查找立场关键词
 */
function findStanceKeywords(text: string): MatchResult[] {
  const results: MatchResult[] = [];

  // 检查信任词
  for (const entry of SUPPORT_DICT) {
    for (const kw of entry.keywords) {
      const pos = text.indexOf(kw);
      if (pos !== -1) {
        const negated = hasNegation(text, pos);
        results.push({
          stance: negated ? 'oppose' : 'support',
          confidence: entry.weight,
          keyword: kw,
          position: pos,
        });
      }
    }
  }

  // 检查怀疑词
  for (const entry of OPPOSE_DICT) {
    for (const kw of entry.keywords) {
      const pos = text.indexOf(kw);
      if (pos !== -1) {
        const negated = hasNegation(text, pos);
        results.push({
          stance: negated ? 'support' : 'oppose',
          confidence: entry.weight,
          keyword: kw,
          position: pos,
        });
      }
    }
  }

  // 检查中立词
  for (const entry of NEUTRAL_DICT) {
    for (const kw of entry.keywords) {
      const pos = text.indexOf(kw);
      if (pos !== -1) {
        results.push({
          stance: 'neutral',
          confidence: entry.weight,
          keyword: kw,
          position: pos,
        });
      }
    }
  }

  return results;
}

/**
 * 应用强度修饰词
 */
function applyIntensityModifiers(text: string, confidence: number, keywordPos: number): number {
  let modified = confidence;

  // 检查关键词前后 6 个字符内的修饰词
  const window = text.substring(
    Math.max(0, keywordPos - 6),
    Math.min(text.length, keywordPos + 10)
  );

  for (const mod of INTENSITY_MODIFIERS) {
    for (const kw of mod.keywords) {
      if (window.includes(kw)) {
        modified += mod.delta;
      }
    }
  }

  return Math.max(0, Math.min(1, modified));
}

/**
 * 从单段发言中提取立场关系
 */
export function extractStances(
  speakerId: PlayerId,
  content: string,
  maxPlayers: number,
  round: number
): StanceRelation[] {
  const relations: StanceRelation[] = [];
  const mentionedPlayers = extractPlayerIds(content, maxPlayers);

  // 如果没有提到其他玩家，跳过
  if (mentionedPlayers.length === 0) {
    return relations;
  }

  // 查找立场关键词
  const stanceMatches = findStanceKeywords(content);

  if (stanceMatches.length === 0) {
    // 没有明确立场词，但提到了玩家 → 中立
    for (const target of mentionedPlayers) {
      if (target !== speakerId) {
        relations.push({
          from: speakerId,
          to: target,
          stance: 'neutral',
          confidence: 0.3,
          evidence: content.substring(0, 50),
          round,
        });
      }
    }
    return relations;
  }

  // 对每个提到的玩家，关联最近的立场词
  for (const target of mentionedPlayers) {
    if (target === speakerId) continue;

    // 找到目标玩家编号在文本中的位置
    const targetPos = content.indexOf(`${target}号`);
    if (targetPos === -1) continue;

    // 找最近的立场词
    let bestMatch: MatchResult | null = null;
    let bestDist = Infinity;

    for (const match of stanceMatches) {
      const dist = Math.abs(match.position - targetPos);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = match;
      }
    }

    if (bestMatch) {
      // 应用强度修饰
      const finalConfidence = applyIntensityModifiers(
        content,
        bestMatch.confidence,
        bestMatch.position
      );

      relations.push({
        from: speakerId,
        to: target,
        stance: bestMatch.stance,
        confidence: finalConfidence,
        evidence: content.substring(
          Math.max(0, Math.min(bestMatch.position, targetPos) - 5),
          Math.min(content.length, Math.max(bestMatch.position, targetPos) + 10)
        ),
        round,
      });
    }
  }

  return relations;
}

// ==================== 主解析函数 ====================

/**
 * 解析完整发言文本
 * @param text 原始发言文本
 * @param maxPlayers 游戏人数
 * @param round 当前轮次
 * @returns 立场关系数组
 */
export function parseSpeeches(
  text: string,
  maxPlayers: number,
  round: number
): { speeches: SpeechRecord[]; relations: StanceRelation[] } {
  const segments = segmentSpeeches(text);
  const speeches: SpeechRecord[] = [];
  const allRelations: StanceRelation[] = [];

  for (const seg of segments) {
    const speakerId = parseInt(seg.speaker, 10);
    if (isNaN(speakerId)) continue;

    speeches.push({
      speaker: speakerId,
      content: seg.content,
      round,
    });

    const relations = extractStances(speakerId, seg.content, maxPlayers, round);
    allRelations.push(...relations);
  }

  return { speeches, relations: allRelations };
}
