import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Category, Task } from '../../domain/task';
import { CategoryFilter } from './CategoryFilter';
import { TaskList } from './TaskList';

afterEach(cleanup);

const tasks: Task[] = [
  {
    id: '1',
    title: '整理计划',
    date: '2026-07-20',
    priority: 'high',
    categoryId: 'work',
    notes: '列出三项重点',
    completed: false,
    createdAt: '2026-07-20T08:00:00Z',
    updatedAt: '2026-07-20T08:00:00Z',
  },
  {
    id: '2',
    title: '阅读',
    date: '2026-07-20',
    priority: 'low',
    categoryId: 'missing',
    notes: '',
    completed: true,
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-07-20T09:00:00Z',
  },
];

const categories: Category[] = [{ id: 'work', name: '工作', color: '#ff847c' }];

describe('TaskList', () => {
  it('separates unfinished and completed tasks and exposes actions', async () => {
    const onToggle = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TaskList
        tasks={tasks}
        categories={categories}
        onCreateFirst={vi.fn()}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByRole('heading', { name: '待完成 · 1' })).toBeVisible();
    expect(screen.getByText('已完成 · 1')).toBeVisible();
    await userEvent.click(screen.getByRole('checkbox', { name: '完成“整理计划”' }));
    expect(onToggle).toHaveBeenCalledWith('1');

    await userEvent.click(screen.getByLabelText('更多操作：整理计划'));
    await userEvent.click(screen.getByRole('button', { name: '编辑“整理计划”' }));
    await userEvent.click(screen.getByRole('button', { name: '删除“整理计划”' }));
    expect(onEdit).toHaveBeenCalledWith('1');
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('renders textual metadata and falls back for an unknown category', () => {
    render(
      <TaskList
        tasks={tasks}
        categories={categories}
        onCreateFirst={vi.fn()}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('工作')).toHaveClass('task-category');
    expect(screen.getByText('未分类')).toHaveClass('task-category');
    expect(screen.getByText('高优先级')).toBeVisible();
    expect(screen.getByText('低优先级')).toBeVisible();
    expect(screen.getByText('有备注')).toBeVisible();
    expect(screen.getByText('整理计划').closest('.task-content')).not.toBeNull();
    expect(screen.getByRole('checkbox', { name: '取消完成“阅读”' })).toBeChecked();
    expect(screen.getByText('阅读').closest('s')).not.toBeNull();
  });

  it('keeps completed tasks in a collapsible section', () => {
    render(
      <TaskList
        tasks={tasks}
        categories={categories}
        onCreateFirst={vi.fn()}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const completedSection = screen.getByText('已完成 · 1').closest('details');
    expect(completedSection).toHaveAttribute('open');
    expect(within(completedSection!).getByText('阅读')).toBeVisible();
  });

  it('offers the first-task action for an empty day', async () => {
    const onCreateFirst = vi.fn();
    render(
      <TaskList
        tasks={[]}
        categories={[]}
        onCreateFirst={onCreateFirst}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '今天还没有任务' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '添加今天第一项' }));
    expect(onCreateFirst).toHaveBeenCalledOnce();
  });

  it('distinguishes an empty category result and clears the filter', async () => {
    const onClearFilter = vi.fn();
    render(
      <TaskList
        tasks={[]}
        dailyTaskCount={2}
        filterActive
        isToday
        categories={categories}
        onCreateFirst={vi.fn()}
        onClearFilter={onClearFilter}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '该分类暂无任务' })).toBeVisible();
    expect(screen.getByText('显示 0 项，共 2 项')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(onClearFilter).toHaveBeenCalledOnce();
  });

  it('uses selected-date wording and reports visible item counts', () => {
    const { rerender } = render(
      <TaskList
        tasks={[]}
        dailyTaskCount={0}
        filterActive={false}
        isToday={false}
        categories={[]}
        onCreateFirst={vi.fn()}
        onClearFilter={vi.fn()}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '所选日期还没有任务' })).toBeVisible();
    expect(screen.getByRole('button', { name: '添加该日第一项' })).toBeVisible();
    expect(screen.queryByText(/今天|今日/)).not.toBeInTheDocument();

    rerender(
      <TaskList
        tasks={[tasks[0]]}
        dailyTaskCount={2}
        filterActive
        isToday={false}
        categories={categories}
        onCreateFirst={vi.fn()}
        onClearFilter={vi.fn()}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('显示 1 项，共 2 项')).toBeVisible();
  });
});

describe('CategoryFilter', () => {
  it('reports all category counts and selection', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} tasks={tasks} selected={null} onChange={onChange} />);

    expect(screen.getByRole('button', { name: '全部 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '工作 1' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: '工作 1' }));
    expect(onChange).toHaveBeenCalledWith('work');
  });

  it('allows returning to all tasks', async () => {
    const onChange = vi.fn();
    render(<CategoryFilter categories={categories} tasks={tasks} selected="work" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '全部 2' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
