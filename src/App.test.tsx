import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

async function createTask(title: string) {
  await userEvent.click(screen.getByRole('button', { name: '新建任务' }));
  await userEvent.type(screen.getByLabelText('任务标题'), title);
  await userEvent.click(screen.getByRole('button', { name: '保存任务' }));
}

it('creates, filters, completes and persists a task', async () => {
  const user = userEvent.setup();
  const first = render(<App initialToday="2026-07-20" />);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '整理计划');
  await user.selectOptions(screen.getByLabelText('分类'), 'work');
  await user.click(screen.getByRole('button', { name: '保存任务' }));
  expect(screen.getByText('整理计划')).toBeVisible();
  await user.click(screen.getByRole('checkbox', { name: '完成“整理计划”' }));
  expect(screen.getByText('100%')).toBeVisible();
  first.unmount();
  render(<App initialToday="2026-07-20" />);
  expect(screen.getByText('整理计划')).toBeVisible();
  expect(screen.getByRole('checkbox', { name: '取消完成“整理计划”' })).toBeChecked();
});

it('renders defaults and warns when local storage reads throw', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });

  render(<App initialToday="2026-07-20" />);

  expect(screen.getByRole('main')).toBeVisible();
  expect(screen.getByText('无法读取本地存储，已载入空清单；当前更改将无法保存')).toBeVisible();
});

it('refreshes today after the next local midnight when no test date is injected', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 20, 23, 59));
  render(<App />);

  expect(screen.getByRole('button', { name: '2026年7月20日，今天' })).toHaveAttribute('aria-pressed', 'true');
  act(() => vi.advanceTimersByTime(2 * 60 * 1000));

  const newToday = screen.getByRole('button', { name: '2026年7月21日，今天' });
  expect(newToday).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: '今天' }));
  expect(newToday).toHaveAttribute('aria-pressed', 'true');
});

it('cleans up the local-midnight timer when the app unmounts', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 20, 12));
  const view = render(<App />);

  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('dismisses a stale undo after a later task is saved', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '旧任务');
  await user.click(screen.getByRole('button', { name: '保存任务' }));
  await user.click(screen.getByRole('checkbox', { name: '完成“旧任务”' }));
  expect(screen.getByRole('button', { name: '撤销' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '后续任务');
  await user.click(screen.getByRole('button', { name: '保存任务' }));

  expect(screen.queryByRole('button', { name: '撤销' })).not.toBeInTheDocument();
  expect(screen.getByText('后续任务')).toBeVisible();
});

it('gives each same-kind notice its own four-second window', async () => {
  render(<App initialToday="2026-07-20" />);
  await createTask('任务 A');
  await createTask('任务 B');
  vi.useFakeTimers();

  fireEvent.click(screen.getByRole('checkbox', { name: '完成“任务 A”' }));
  act(() => vi.advanceTimersByTime(3900));
  fireEvent.click(screen.getByRole('checkbox', { name: '完成“任务 B”' }));

  act(() => vi.advanceTimersByTime(3999));
  expect(screen.getByText('任务已完成')).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByText('任务已完成')).not.toBeInTheDocument();
});

it('removes the undo action after a successful undo and cannot apply it again', async () => {
  render(<App initialToday="2026-07-20" />);
  await createTask('单次撤销');
  fireEvent.click(screen.getByRole('checkbox', { name: '完成“单次撤销”' }));

  const undo = screen.getByRole('button', { name: '撤销' });
  fireEvent.click(undo);

  expect(screen.getByRole('checkbox', { name: '完成“单次撤销”' })).not.toBeChecked();
  expect(screen.queryByRole('button', { name: '撤销' })).not.toBeInTheDocument();
  fireEvent.click(undo);
  expect(screen.getByRole('checkbox', { name: '完成“单次撤销”' })).not.toBeChecked();
});

it('keeps a save error and the current undo action visible together', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '旧任务');
  await user.click(screen.getByRole('button', { name: '保存任务' }));
  await user.click(screen.getByRole('checkbox', { name: '完成“旧任务”' }));

  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '保存会失败');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('quota');
  });
  await user.click(screen.getByRole('button', { name: '保存任务' }));

  const notifications = screen.getByRole('region', { name: '通知' });
  expect(within(notifications).getByText('保存失败，内容尚未写入浏览器')).toBeVisible();
  expect(within(notifications).getByText('任务已完成')).toBeVisible();
  const closeError = within(notifications).getByRole('button', { name: '关闭提示' });
  const undo = within(notifications).getByRole('button', { name: '撤销' });
  expect(closeError).toBeDisabled();
  expect(undo).toBeDisabled();

  await user.click(screen.getByRole('button', { name: '取消' }));
  expect(closeError).toBeEnabled();
  expect(undo).toBeEnabled();
  await user.click(closeError);
  expect(screen.queryByText('保存失败，内容尚未写入浏览器')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '撤销' })).toBeVisible();
});

it('keeps total progress unchanged when category filtering hides tasks', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  for (const [title, category] of [['工作任务', 'work'], ['生活任务', 'life']] as const) {
    await user.click(screen.getByRole('button', { name: '新建任务' }));
    await user.type(screen.getByLabelText('任务标题'), title);
    await user.selectOptions(screen.getByLabelText('分类'), category);
    await user.click(screen.getByRole('button', { name: '保存任务' }));
  }
  await user.click(screen.getByRole('checkbox', { name: '完成“生活任务”' }));
  expect(screen.getByText('50%')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '工作 1' }));
  expect(screen.getByText('工作任务')).toBeVisible();
  expect(screen.queryByText('生活任务')).not.toBeInTheDocument();
  expect(screen.getByText('50%')).toBeVisible();
});

it('explains and clears an empty category result and reveals a newly saved task', async () => {
  render(<App initialToday="2026-07-20" />);
  await createTask('已有任务');
  await userEvent.click(screen.getByRole('button', { name: '工作 0' }));

  expect(screen.getByRole('heading', { name: '该分类暂无任务' })).toBeVisible();
  expect(screen.getByText('显示 0 项，共 1 项')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '清除筛选' }));
  expect(screen.getByText('已有任务')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: '工作 0' }));
  await createTask('筛选中创建');
  expect(screen.getByText('筛选中创建')).toBeVisible();
  expect(screen.getByRole('button', { name: '全部 2' })).toHaveAttribute('aria-pressed', 'true');
});

it('uses selected-date wording throughout the list and progress panel', async () => {
  render(<App initialToday="2026-07-20" />);
  await userEvent.click(screen.getByRole('button', { name: '2026年7月21日' }));

  expect(screen.getByRole('heading', { name: '所选日期还没有任务' })).toBeVisible();
  expect(screen.getByRole('button', { name: '添加该日第一项' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '所选日期进度' })).toBeVisible();
  expect(screen.queryByText('今天还没有任务')).not.toBeInTheDocument();
  expect(screen.queryByText('今日进度')).not.toBeInTheDocument();
});

it('keeps notification text live but disables its action while a modal is open', async () => {
  render(<App initialToday="2026-07-20" />);
  await createTask('模态通知');
  fireEvent.click(screen.getByRole('checkbox', { name: '完成“模态通知”' }));
  await userEvent.click(screen.getByRole('button', { name: '新建任务' }));

  expect(screen.getByRole('status')).toHaveTextContent('任务已完成');
  const undo = screen.getByRole('button', { name: '撤销' });
  expect(undo).toBeDisabled();
  undo.focus();
  expect(undo).not.toHaveFocus();
  expect(screen.getByLabelText('任务标题')).toHaveFocus();
});

it('announces completion and exposes the month dialog', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  expect(screen.getByRole('main')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '整理计划');
  await user.click(screen.getByRole('button', { name: '保存任务' }));
  await user.click(screen.getByRole('checkbox', { name: '完成“整理计划”' }));
  expect(screen.getByRole('status')).toHaveTextContent('任务已完成');
  await user.click(screen.getByRole('button', { name: /2026 年 7 月/ }));
  expect(screen.getByRole('dialog', { name: '选择日期' })).toBeVisible();
});

it('disables the month picker trigger while the task drawer is open', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  const monthTrigger = screen.getByRole('button', { name: /2026 年 7 月/ });

  await user.click(screen.getByRole('button', { name: '新建任务' }));

  expect(screen.getByRole('dialog', { name: '新建任务' })).toBeVisible();
  expect(monthTrigger).toBeDisabled();
  await user.click(monthTrigger);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.queryByRole('dialog', { name: '选择日期' })).not.toBeInTheDocument();
});

it('keeps the month picker open when a background create action is dispatched', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  const backgroundCreate = screen.getAllByRole('button', { name: '新建任务' })[0];

  await user.click(screen.getByRole('button', { name: /2026 年 7 月/ }));
  expect(screen.getByRole('dialog', { name: '选择日期' })).toBeVisible();
  fireEvent.click(backgroundCreate);

  expect(screen.getByRole('dialog', { name: '选择日期' })).toBeVisible();
  expect(screen.queryByRole('dialog', { name: '新建任务' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});

it('isolates the background and ignores its date, category and task actions while a modal is open', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '受保护的任务');
  await user.selectOptions(screen.getByLabelText('分类'), 'work');
  await user.click(screen.getByRole('button', { name: '保存任务' }));

  const dateButton = screen.getByRole('button', { name: '2026年7月21日' });
  const categoryButton = screen.getByRole('button', { name: '工作 1' });
  const taskCheckbox = screen.getByRole('checkbox', { name: '完成“受保护的任务”' });
  await user.click(screen.getByRole('button', { name: '新建任务' }));

  const background = screen.getByTestId('app-background');
  const drawer = screen.getByRole('dialog', { name: '新建任务' });
  expect(background).toHaveAttribute('inert');
  expect(background).toHaveAttribute('aria-hidden', 'true');
  expect(background).not.toContainElement(drawer);

  fireEvent.click(dateButton);
  fireEvent.click(categoryButton);
  fireEvent.click(taskCheckbox);
  expect(screen.getByLabelText('日期')).toHaveValue('2026-07-20');
  expect(dateButton).toHaveAttribute('aria-pressed', 'false');
  expect(categoryButton).toHaveAttribute('aria-pressed', 'false');
  expect(taskCheckbox).not.toBeChecked();

  await user.click(screen.getByRole('button', { name: '取消' }));
  await user.click(screen.getByRole('button', { name: /2026 年 7 月/ }));
  const monthDialog = screen.getByRole('dialog', { name: '选择日期' });
  expect(background).toHaveAttribute('inert');
  expect(background).toHaveAttribute('aria-hidden', 'true');
  expect(background).not.toContainElement(monthDialog);
});

it('focuses the task-list fallback when saving an edit removes its opener', async () => {
  const user = userEvent.setup();
  render(<App initialToday="2026-07-20" />);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '移动到明天');
  await user.click(screen.getByRole('button', { name: '保存任务' }));
  await user.click(screen.getByLabelText('更多操作：移动到明天'));
  await user.click(screen.getByRole('button', { name: '编辑“移动到明天”' }));

  fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-07-21' } });
  await user.click(screen.getByRole('button', { name: '保存任务' }));

  expect(screen.queryByText('移动到明天')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '今天还没有任务' })).toHaveFocus();
});
