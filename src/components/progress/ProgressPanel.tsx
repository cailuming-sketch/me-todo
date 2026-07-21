import type { CSSProperties } from 'react';

interface ProgressPanelProps {
  completed: number;
  total: number;
  percent: number | null;
  isToday?: boolean;
}

export function ProgressPanel({ completed, total, percent, isToday = true }: ProgressPanelProps) {
  const heading = isToday ? '今日进度' : '所选日期进度';
  if (percent === null) {
    return (
      <aside className="progress-panel">
        <h2>{heading}</h2>
        <p>{isToday ? '添加任务后，这里会记录你的进度' : '添加任务后，这里会记录该日进度'}</p>
      </aside>
    );
  }

  return (
    <aside className="progress-panel">
      <h2>{heading}</h2>
      <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as CSSProperties}>
        <strong>{percent}%</strong>
      </div>
      <p>
        已完成 {completed} / {total}
      </p>
      <blockquote>完成一点，就离目标近一点。</blockquote>
    </aside>
  );
}
