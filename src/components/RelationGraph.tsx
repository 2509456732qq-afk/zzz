import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useGameStore } from '../store/gameStore';

export function RelationGraph() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { players, stances, playerCount } = useGameStore();

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // 构建节点
    const nodes = players.map(player => ({
      id: `${player.id}`,
      name: `${player.id}号`,
      symbolSize: 30 + player.evilProbability * 30,
      itemStyle: {
        color: player.evilProbability > 0.6
          ? '#ef4444'
          : player.evilProbability > 0.4
            ? '#f59e0b'
            : '#22c55e',
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'bottom' as const,
        formatter: `${player.id}号\n${(player.evilProbability * 100).toFixed(0)}%`,
      },
    }));

    // 构建边（只显示置信度 > 0.3 的立场）
    const edges: any[] = [];
    const edgeMap = new Map<string, { support: number; oppose: number }>();

    for (const stance of stances) {
      if (stance.confidence < 0.3) continue;

      const key = `${stance.from}-${stance.to}`;
      const entry = edgeMap.get(key) ?? { support: 0, oppose: 0 };

      if (stance.stance === 'support') {
        entry.support += stance.confidence;
      } else if (stance.stance === 'oppose') {
        entry.oppose += stance.confidence;
      }

      edgeMap.set(key, entry);
    }

    for (const [key, value] of edgeMap) {
      const [from, to] = key.split('-');
      const netStance = value.support - value.oppose;

      if (Math.abs(netStance) < 0.2) continue;

      edges.push({
        source: from,
        target: to,
        lineStyle: {
          color: netStance > 0 ? '#22c55e' : '#ef4444',
          width: Math.abs(netStance) * 5,
          curveness: 0.3,
        },
        label: {
          show: true,
          formatter: netStance > 0 ? '保' : '踩',
          color: netStance > 0 ? '#166534' : '#991b1b',
          fontSize: 12,
        },
      });
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const player = players.find(p => p.id === parseInt(params.id));
            return `${params.name}<br/>邪恶概率：${((player?.evilProbability ?? 0.5) * 100).toFixed(1)}%`;
          }
          return '';
        },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: edges,
        roam: true,
        draggable: true,
        force: {
          repulsion: 200,
          edgeLength: [100, 200],
          gravity: 0.1,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 6,
          },
        },
        lineStyle: {
          opacity: 0.8,
        },
      }],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [players, stances, playerCount]);

  return (
    <div className="relation-graph">
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-line" style={{ background: '#22c55e' }} />
          <span>信任关系</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ background: '#ef4444' }} />
          <span>怀疑关系</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#22c55e', width: 16, height: 16 }} />
          <span>低邪恶概率</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#ef4444', width: 24, height: 24 }} />
          <span>高邪恶概率</span>
        </div>
      </div>
    </div>
  );
}
