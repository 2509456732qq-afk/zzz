// ==================== 阿瓦隆专用词典 ====================

/** 关键词条目 */
interface DictEntry {
  keywords: string[];
  weight: number;  // 基础权重
}

/** 信任词典 */
export const SUPPORT_DICT: DictEntry[] = [
  { keywords: ['保', '保他', '保她', '我保'], weight: 0.8 },
  { keywords: ['信', '信他', '信她', '我信', '相信'], weight: 0.7 },
  { keywords: ['没问题', '没毛病', '应该没问题'], weight: 0.5 },
  { keywords: ['干净', '很干净', '看着干净'], weight: 0.6 },
  { keywords: ['铁好', '铁好人', '定好', '定好人'], weight: 0.9 },
  { keywords: ['站边', '站他边', '我站他'], weight: 0.7 },
  { keywords: ['好人', '是好人', '我觉得是好人', '像是好人'], weight: 0.6 },
  { keywords: ['认好', '认好人', '可以认好'], weight: 0.6 },
  { keywords: ['做实', '做实好人', '实锤好人'], weight: 0.8 },
  { keywords: ['过了', '可以过', '能过'], weight: 0.3 },
];

/** 怀疑词典 */
export const OPPOSE_DICT: DictEntry[] = [
  { keywords: ['踩', '踩他', '踩她', '我踩'], weight: 0.8 },
  { keywords: ['有问题', '有嫌疑', '嫌疑很大'], weight: 0.6 },
  { keywords: ['可能是坏人', '可能是狼', '像坏人', '像狼'], weight: 0.6 },
  { keywords: ['行为差', '行为不好', '行为可疑'], weight: 0.5 },
  { keywords: ['不信任', '不信', '不太信'], weight: 0.6 },
  { keywords: ['铁坏', '铁狼', '定坏', '定狼'], weight: 0.9 },
  { keywords: ['坏人', '是坏人', '是狼', '狼人'], weight: 0.7 },
  { keywords: ['划水', '在划水', '划水嫌疑'], weight: 0.4 },
  { keywords: ['不做好', '不像是好人', '不像好人'], weight: 0.5 },
  { keywords: ['出问题', '炸了', '翻车'], weight: 0.5 },
  { keywords: ['坑', '挖坑', '有坑'], weight: 0.4 },
];

/** 中立词典 */
export const NEUTRAL_DICT: DictEntry[] = [
  { keywords: ['看不清', '看不太清', '看不透'], weight: 0.5 },
  { keywords: ['再观察', '再看看', '再观察一下'], weight: 0.4 },
  { keywords: ['不确定', '不好说', '说不准'], weight: 0.4 },
  { keywords: ['先不判断', '先不下判断', '暂时不判断'], weight: 0.3 },
  { keywords: ['中立', '保持中立', '先中立'], weight: 0.5 },
  { keywords: ['观望', '观望一下', '先观望'], weight: 0.4 },
  { keywords: ['存疑', '有待观察'], weight: 0.4 },
];

/** 强度修饰词 */
export const INTENSITY_MODIFIERS: { keywords: string[]; delta: number }[] = [
  // 正向加强
  { keywords: ['非常', '特别', '极其', '十分', '非常非常'], delta: 0.2 },
  { keywords: ['铁', '一定', '肯定', '绝对', '必然', '实锤'], delta: 0.3 },
  { keywords: ['直接', '直接认', '直接踩'], delta: 0.15 },
  // 负向削弱
  { keywords: ['有点', '稍微', '略微', '可能', '也许', '大概'], delta: -0.2 },
  { keywords: ['不太', '不是很', '不算'], delta: -0.15 },
  { keywords: ['但是', '不过', '然而'], delta: -0.1 },  // 转折词通常削弱立场
];

/** 否定词（翻转立场） */
export const NEGATION_WORDS = ['不', '不是', '没有', '别', '不要', '不会', '不可能', '不太'];

/** 数字映射（中文数字 → 阿拉伯数字） */
export const NUMBER_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
  '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
};

/**
 * 从文本中提取玩家编号
 * 支持格式：3号、三号、3号位、3号玩家、3号位玩家
 */
export function extractPlayerIds(text: string, maxPlayers: number): number[] {
  const results: Set<number> = new Set();

  // 匹配 "数字+号" 模式
  const digitPattern = /(\d{1,2})\s*号/g;
  let match;
  while ((match = digitPattern.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= maxPlayers) {
      results.add(num);
    }
  }

  // 匹配中文数字
  for (const [cn, num] of Object.entries(NUMBER_MAP)) {
    if (num >= 1 && num <= maxPlayers && text.includes(cn + '号')) {
      results.add(num);
    }
  }

  return Array.from(results);
}

/**
 * 检测否定词
 */
export function hasNegation(text: string, keywordPos: number): boolean {
  // 检查关键词前面 4 个字符内是否有否定词
  const lookback = text.substring(Math.max(0, keywordPos - 4), keywordPos);
  return NEGATION_WORDS.some(neg => lookback.includes(neg));
}
