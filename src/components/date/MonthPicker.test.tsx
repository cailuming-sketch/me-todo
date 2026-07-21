import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { MonthPicker } from './MonthPicker';

afterEach(cleanup);

function MonthPickerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开月历</button>
      <MonthPicker
        open={open}
        selectedDate="2026-07-20"
        onSelect={vi.fn()}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

it('chooses a date outside the current seven-day window', async () => {
  const onSelect = vi.fn();
  render(
    <MonthPicker
      open
      selectedDate="2026-07-20"
      onSelect={onSelect}
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole('dialog')).toHaveClass('month-dialog');

  await userEvent.click(screen.getByRole('button', { name: '2026年7月31日' }));

  expect(onSelect).toHaveBeenCalledWith('2026-07-31');
});

it('renders a Monday-first 42-cell grid including cross-month dates', () => {
  render(
    <MonthPicker open selectedDate="2026-07-20" onSelect={vi.fn()} onClose={vi.fn()} />,
  );

  const dateButtons = within(screen.getByRole('dialog')).getAllByRole('button', {
    name: /^\d{4}年\d{1,2}月\d{1,2}日$/,
  });
  expect(dateButtons).toHaveLength(42);
  expect(dateButtons[0]).toHaveAccessibleName('2026年6月29日');
  expect(dateButtons.at(-1)).toHaveAccessibleName('2026年8月9日');
});

it('pages to adjacent calendar months', async () => {
  render(
    <MonthPicker open selectedDate="2026-07-20" onSelect={vi.fn()} onClose={vi.fn()} />,
  );

  await userEvent.click(screen.getByRole('button', { name: '下个月' }));
  expect(screen.getByRole('button', { name: '2026年9月6日' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '上个月' }));
  expect(screen.getByRole('button', { name: '2026年6月29日' })).toBeVisible();
});

it('removes its Escape listener when the picker closes', () => {
  const removeEventListener = vi.spyOn(document, 'removeEventListener');
  const props = { selectedDate: '2026-07-20', onSelect: vi.fn(), onClose: vi.fn() };
  const view = render(<MonthPicker {...props} open />);

  view.rerender(<MonthPicker {...props} open={false} />);

  expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
});

it('closes with Escape', async () => {
  const onClose = vi.fn();
  render(
    <MonthPicker
      open
      selectedDate="2026-07-20"
      onSelect={vi.fn()}
      onClose={onClose}
    />,
  );

  await userEvent.keyboard('{Escape}');

  expect(onClose).toHaveBeenCalledOnce();
});

it('keeps focus inside the open dialog and restores the opener when closed', async () => {
  const props = {
    selectedDate: '2026-07-20' as const,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };
  const { rerender } = render(
    <>
      <button type="button">打开月历</button>
      <MonthPicker {...props} open={false} />
    </>,
  );
  const opener = screen.getByRole('button', { name: '打开月历' });
  opener.focus();

  rerender(
    <>
      <button type="button">打开月历</button>
      <MonthPicker {...props} open />
    </>,
  );
  const dialog = screen.getByRole('dialog', { name: '选择日期' });
  const controls = within(dialog).getAllByRole('button');
  expect(controls[0]).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(controls.at(-1)).toHaveFocus();

  rerender(
    <>
      <button type="button">打开月历</button>
      <MonthPicker {...props} open={false} />
    </>,
  );
  expect(opener).toHaveFocus();
});

it('restores the opener after Escape closes the controlled dialog', async () => {
  const user = userEvent.setup();
  render(<MonthPickerHarness />);
  const opener = screen.getByRole('button', { name: '打开月历' });

  await user.click(opener);
  expect(screen.getByRole('dialog', { name: '选择日期' })).toBeVisible();
  await user.keyboard('{Escape}');

  expect(screen.queryByRole('dialog', { name: '选择日期' })).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

it('restores the opener after date selection closes the controlled dialog', async () => {
  const user = userEvent.setup();
  render(<MonthPickerHarness />);
  const opener = screen.getByRole('button', { name: '打开月历' });

  await user.click(opener);
  await user.click(screen.getByRole('button', { name: '2026年7月31日' }));

  expect(screen.queryByRole('dialog', { name: '选择日期' })).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
