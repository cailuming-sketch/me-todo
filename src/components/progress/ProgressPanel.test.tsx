import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';

afterEach(cleanup);

describe('ProgressPanel', () => {
  it('uses all daily tasks regardless of the visible filter', () => {
    render(<ProgressPanel completed={3} total={5} percent={60} />);

    expect(screen.getByText('60%')).toBeVisible();
    expect(screen.getByText('已完成 3 / 5')).toBeVisible();
    expect(screen.getByText('60%').parentElement).toHaveStyle({ '--progress': '216deg' });
  });

  it('does not render a meaningless zero-percent ring for an empty day', () => {
    render(<ProgressPanel completed={0} total={0} percent={null} />);

    expect(screen.getByText('添加任务后，这里会记录你的进度')).toBeVisible();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('uses selected-date wording outside today', () => {
    render(<ProgressPanel completed={0} total={0} percent={null} isToday={false} />);

    expect(screen.getByRole('heading', { name: '所选日期进度' })).toBeVisible();
    expect(screen.getByText('添加任务后，这里会记录该日进度')).toBeVisible();
    expect(screen.queryByText(/今天|今日/)).not.toBeInTheDocument();
  });
});
