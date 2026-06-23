import type { PlayerId, Vote, MissionVote, MissionResult } from '../types';

// ==================== 投票解析 ====================

/**
 * 解析组队投票文本
 * 支持格式：
 *   "1号赞成，2号反对，3号赞成..."
 *   "赞成：1,2,3  反对：4,5"
 *   "通过" / "否决"
 */
export function parseTeamVotes(
  text: string,
  maxPlayers: number
): { votes: Vote[]; approved: boolean } {
  const votes: Vote[] = [];
  let approved = true;

  // 格式1：逐个标注
  const individualPattern = /(\d{1,2})\s*号?\s*(赞成|同意|支持|通过|反对|否决|不同意)/g;
  let match;
  while ((match = individualPattern.exec(text)) !== null) {
    const voter = parseInt(match[1], 10);
    const isApprove = ['赞成', '同意', '支持', '通过'].includes(match[2]);
    if (voter >= 1 && voter <= maxPlayers) {
      votes.push({ voter, approve: isApprove });
    }
  }

  // 格式2：批量标注
  if (votes.length === 0) {
    const batchApprove = text.match(/(?:赞成|同意|支持)[：:]\s*([\d,\s]+)/);
    const batchReject = text.match(/(?:反对|否决|不同意)[：:]\s*([\d,\s]+)/);

    if (batchApprove) {
      const ids = batchApprove[1].match(/\d+/g);
      if (ids) {
        for (const id of ids) {
          const voter = parseInt(id, 10);
          if (voter >= 1 && voter <= maxPlayers) {
            votes.push({ voter, approve: true });
          }
        }
      }
    }
    if (batchReject) {
      const ids = batchReject[1].match(/\d+/g);
      if (ids) {
        for (const id of ids) {
          const voter = parseInt(id, 10);
          if (voter >= 1 && voter <= maxPlayers) {
            votes.push({ voter, approve: false });
          }
        }
      }
    }
  }

  // 格式3：简单通过/否决
  if (votes.length === 0) {
    if (/通过|pass/i.test(text)) {
      approved = true;
    } else if (/否决|reject/i.test(text)) {
      approved = false;
    }
  }

  // 根据投票结果判断是否通过
  if (votes.length > 0) {
    const approveCount = votes.filter(v => v.approve).length;
    approved = approveCount > votes.length / 2;
  }

  return { votes, approved };
}

/**
 * 解析队伍成员
 * 支持格式："队伍：1,2,3" / "组队 1 2 3" / "出队 1号 2号 3号"
 */
export function parseTeamMembers(text: string, maxPlayers: number): PlayerId[] {
  const members: PlayerId[] = [];

  // 提取所有数字
  const numbers = text.match(/\d+/g);
  if (numbers) {
    for (const num of numbers) {
      const id = parseInt(num, 10);
      if (id >= 1 && id <= maxPlayers && !members.includes(id)) {
        members.push(id);
      }
    }
  }

  return members;
}

/**
 * 解析任务投票（秘密投票，只知道失败数量）
 * 支持格式："任务成功" / "任务失败，1张失败票" / "2票失败"
 */
export function parseMissionVotes(
  text: string,
  teamMembers: PlayerId[],
  doubleFail: boolean
): { votes: MissionVote[]; result: MissionResult; failCount: number } {
  const failCountMatch = text.match(/(\d+)\s*(?:张|票|个)\s*(?:失败|反对)/);
  const failCount = failCountMatch ? parseInt(failCountMatch[1], 10) : 0;

  let result: MissionResult;
  if (failCount === 0) {
    result = 'success';
  } else if (doubleFail) {
    result = failCount >= 2 ? 'fail' : 'success';
  } else {
    result = failCount >= 1 ? 'fail' : 'success';
  }

  // 由于是秘密投票，我们不知道谁投了失败
  // 只能根据队伍成员创建匿名投票记录
  const votes: MissionVote[] = teamMembers.map(voter => ({
    voter,
    success: true, // 无法确定，全部标记为成功
  }));

  // 如果任务失败，标记有未知的失败票
  if (result === 'fail') {
    votes.push({
      voter: -1, // -1 表示未知
      success: false,
    });
  }

  return { votes, result, failCount };
}

/**
 * 从文本中提取队长
 * 支持格式："队长是1号" / "1号当队长" / "本轮队长：1"
 */
export function parseLeader(text: string, maxPlayers: number): PlayerId | null {
  const patterns = [
    /队长\s*(?:是|为)\s*(\d{1,2})/,
    /(\d{1,2})\s*号?\s*(?:当|做|是)\s*队长/,
    /(?:本轮|这轮)\s*队长\s*[：:]\s*(\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id >= 1 && id <= maxPlayers) {
        return id;
      }
    }
  }

  return null;
}
