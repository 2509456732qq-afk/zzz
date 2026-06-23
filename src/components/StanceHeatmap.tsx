import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useGameStore } from '../store/gameStore';

export function StanceHeatmap() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { stances, playerCount } = useGameStore();

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // 构建立场矩阵
    const matrix: number[][] = Array.from({ length: playerCount }, () =>
      Array.from({ length: playerCount }, () => 0)
    );

    // 填充矩阵
    for (const stance of stances) {
      const fromIdx = stance.from - 1;
      const toIdx = stance.to - 1;

      if (fromIdx >= 0 && fromIdx < playerCount && toIdx >= 0 && toIdx < playerCount) {
        let value = 0;
        if (stance.stance === 'support') {
          value = stance.confidence;
        } else if (stance.stance === 'oppose') {
          value = -stance.confidence;
        }
        matrix[fromIdx][toIdx] = (matrix[fromIdx][toIdx] + value) / 2;
      }
    }

    // 转换为 ECharts 数据格式
    const data: [number, number, number][] = [];
    for (let i = 0; i < playerCount; i++) {
      for (let j = 0; j < playerCount; j++) {
        if (i !== j) {
          data.push([j, i, matrix[i][j]]);
        }
      }
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [x, y, value] = params.data;
          const from = y + 1;
          const to = x + 1;
          let stance = '中立';
          if (value > 0.2) stance = '信任';
          else if (value < -0.2) stance = '怀疑';

          return `${from}号 → ${to}号<br/>立场：${stance}<br/>强度：${Math.abs(value).toFixed(2)}`;
        },
      },
      grid: {
        left: 60,
        right: 40,
        top: 40,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: playerCount }, (_, i) => `${i + 1}号`),
        name: '被评价者',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          color: '#666',
        },
      },
      yAxis: {
        type: 'category',
        data: Array.from({ length: playerCount }, (_, i) => `${i + 1}号`),
        name: '评价者',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: {
          color: '#666',
        },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: ['#ef4444', '#fbbf24', '#22c55e'],
        },
        text: ['信任', '怀疑'],
        textStyle: {
          color: '#666',
        },
      },
      series: [{
        name: '立场',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          formatter: (params: any) => {
            const value = params.data[2];
            if (value > 0.2) return '保';
            if (value < -0.2) return '踩';
            return '';
          },
          color: '#333',
          fontSize: 14,
          fontWeight: 'bold',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
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
  }, [stances, playerCount]);

  return (
    <div className="stance-heatmap">
      <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
      <div className="heatmap-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#22c55e' }} />
          <span>信任（保）</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#fbbf24' }} />
          <span>中立</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ef4444' }} />
          <span>怀疑（踩）</span>
        </div>
      </div>
    </div>
  );
}
