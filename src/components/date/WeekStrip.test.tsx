import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeekStrip } from './WeekStrip';

afterEach(cleanup);

describe('WeekStrip', () => {
  it('shows seven dates and selects a date', async () => {
    const onSelect = vi.fn();
    render(
      <WeekStrip
        selectedDate="2026-07-20"
        today="2026-07-20"
        onSelect={onSelect}
        onOpenMonth={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: /2026年7月/ })).toHaveLength(7);

    await userEvent.click(screen.getByRole('button', { name: /2026年7月21日/ }));

    expect(onSelect).toHaveBeenCalledWith('2026-07-21');
    expect(screen.getByRole('button', { name: /2026年7月20日/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('routes previous, next and today controls to their exact dates', async () => {
    const onSelect = vi.fn();
    render(
      <WeekStrip
        selectedDate="2026-07-20"
        today="2026-07-18"
        onSelect={onSelect}
        onOpenMonth={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '前一天' }));
    await userEvent.click(screen.getByRole('button', { name: '后一天' }));
    await userEvent.click(screen.getByRole('button', { name: '今天' }));

    expect(onSelect.mock.calls).toEqual([['2026-07-19'], ['2026-07-21'], ['2026-07-18']]);
  });
});
