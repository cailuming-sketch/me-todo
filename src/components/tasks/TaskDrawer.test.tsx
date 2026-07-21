import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../domain/task';
import { TaskDrawer } from './TaskDrawer';

const categories = [{ id: 'work', name: '工作', color: '#ff847c' }];

afterEach(cleanup);

const task: Task = {
  id: 'task-1',
  title: '整理计划',
  date: '2026-07-19',
  priority: 'high',
  categoryId: 'work',
  notes: '旧备注',
  completed: false,
  createdAt: '2026-07-18T08:00:00.000Z',
  updatedAt: '2026-07-18T08:00:00.000Z',
};

const renderDrawer = (overrides: Partial<React.ComponentProps<typeof TaskDrawer>> = {}) => {
  const props: React.ComponentProps<typeof TaskDrawer> = {
    open: true,
    selectedDate: '2026-07-20',
    categories,
    task: null,
    onSave: vi.fn(() => true),
    onAddCategory: vi.fn(() => true),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<TaskDrawer {...props} />), props };
};

function TaskDrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开任务抽屉</button>
      <TaskDrawer
        open={open}
        selectedDate="2026-07-20"
        categories={categories}
        task={null}
        onSave={vi.fn(() => true)}
        onAddCategory={vi.fn(() => true)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe('TaskDrawer', () => {
  it('blocks an empty title and submits normalized values', async () => {
    const onSave = vi.fn(() => true);
    renderDrawer({ onSave });

    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));
    expect(screen.getByText('请输入任务标题')).toBeVisible();

    await userEvent.type(screen.getByLabelText('任务标题'), '  整理计划  ');
    await userEvent.selectOptions(screen.getByLabelText('优先级'), 'high');
    await userEvent.type(screen.getByLabelText('备注'), '  今日完成  ');
    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));

    expect(onSave).toHaveBeenCalledWith({
      title: '整理计划',
      date: '2026-07-20',
      priority: 'high',
      categoryId: null,
      notes: '今日完成',
    });
  });

  it('shows a date error and does not save an invalid date', async () => {
    const onSave = vi.fn(() => true);
    renderDrawer({ onSave });

    await userEvent.type(screen.getByLabelText('任务标题'), '任务');
    await userEvent.clear(screen.getByLabelText('日期'));
    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));

    expect(screen.getByRole('alert')).toHaveTextContent('请选择有效日期');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('prefills edit fields and submits the updated draft', async () => {
    const onSave = vi.fn(() => true);
    renderDrawer({ task, onSave });

    expect(screen.getByRole('heading', { name: '编辑任务' })).toBeVisible();
    expect(screen.getByLabelText('任务标题')).toHaveValue('整理计划');
    expect(screen.getByLabelText('日期')).toHaveValue('2026-07-19');
    expect(screen.getByLabelText('优先级')).toHaveValue('high');
    expect(screen.getByLabelText('分类')).toHaveValue('work');
    expect(screen.getByLabelText('备注')).toHaveValue('旧备注');

    await userEvent.clear(screen.getByLabelText('备注'));
    await userEvent.type(screen.getByLabelText('备注'), '新备注');
    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));

    expect(onSave).toHaveBeenCalledWith({
      title: '整理计划',
      date: '2026-07-19',
      priority: 'high',
      categoryId: 'work',
      notes: '新备注',
    });
  });

  it('initializes fresh values whenever it opens', async () => {
    const { rerender, props } = renderDrawer();
    await userEvent.type(screen.getByLabelText('任务标题'), '未保存内容');

    rerender(<TaskDrawer {...props} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<TaskDrawer {...props} open selectedDate="2026-07-21" task={task} />);

    expect(screen.getByRole('heading', { name: '编辑任务' })).toBeVisible();
    expect(screen.getByLabelText('任务标题')).toHaveValue('整理计划');
    expect(screen.getByLabelText('日期')).toHaveValue('2026-07-19');
  });

  it('resets draft, validation and new-category controls on every fresh create open', async () => {
    const { rerender, props } = renderDrawer();
    await userEvent.type(screen.getByLabelText('任务标题'), '未保存内容');
    await userEvent.clear(screen.getByLabelText('日期'));
    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));
    await userEvent.type(screen.getByLabelText('分类名称'), '临时分类');
    await userEvent.click(screen.getByRole('button', { name: '选择颜色 #7f8cff' }));
    expect(screen.getAllByRole('alert')).not.toHaveLength(0);

    rerender(<TaskDrawer {...props} open={false} />);
    rerender(<TaskDrawer {...props} open selectedDate="2026-07-21" task={null} />);

    expect(screen.getByLabelText('任务标题')).toHaveValue('');
    expect(screen.getByLabelText('日期')).toHaveValue('2026-07-21');
    expect(screen.getByLabelText('优先级')).toHaveValue('medium');
    expect(screen.getByLabelText('分类')).toHaveValue('');
    expect(screen.getByLabelText('备注')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('分类名称')).toHaveValue('');
    expect(screen.getByRole('button', { name: '选择颜色 #ff847c' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('closes only after a successful save', async () => {
    const onSave = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    const onClose = vi.fn();
    renderDrawer({ onSave, onClose });
    await userEvent.type(screen.getByLabelText('任务标题'), '任务');

    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: '保存任务' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancels or presses Escape without saving', async () => {
    const onSave = vi.fn(() => true);
    const onClose = vi.fn();
    renderDrawer({ onSave, onClose });

    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('focuses the title when opened', () => {
    renderDrawer();
    expect(screen.getByLabelText('任务标题')).toHaveFocus();
  });

  it('wraps keyboard focus in both directions inside the open drawer', async () => {
    render(
      <TaskDrawer
        open
        selectedDate="2026-07-20"
        categories={categories}
        task={null}
        onSave={vi.fn()}
        onAddCategory={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const title = screen.getByLabelText('任务标题');
    expect(title).toHaveFocus();
    await userEvent.tab({ shift: true });
    const save = screen.getByRole('button', { name: '保存任务' });
    expect(save).toHaveFocus();
    await userEvent.tab();
    expect(title).toHaveFocus();
  });

  it('restores focus to the opening control when closed', () => {
    const props: React.ComponentProps<typeof TaskDrawer> = {
      open: false,
      selectedDate: '2026-07-20',
      categories,
      task: null,
      onSave: vi.fn(),
      onAddCategory: vi.fn(),
      onClose: vi.fn(),
    };
    const { rerender } = render(
      <>
        <button type="button">打开任务抽屉</button>
        <TaskDrawer {...props} />
      </>,
    );
    const opener = screen.getByRole('button', { name: '打开任务抽屉' });
    opener.focus();

    rerender(
      <>
        <button type="button">打开任务抽屉</button>
        <TaskDrawer {...props} open />
      </>,
    );
    expect(screen.getByLabelText('任务标题')).toHaveFocus();

    rerender(
      <>
        <button type="button">打开任务抽屉</button>
        <TaskDrawer {...props} />
      </>,
    );
    expect(opener).toHaveFocus();
  });

  it('restores the opener after cancel and Escape close the controlled drawer', async () => {
    const user = userEvent.setup();
    render(<TaskDrawerHarness />);
    const opener = screen.getByRole('button', { name: '打开任务抽屉' });

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建任务' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '新建任务' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('adds a trimmed category with a preset color and clears only on success', async () => {
    const onAddCategory = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderDrawer({ onAddCategory });

    await userEvent.type(screen.getByLabelText('分类名称'), '  生活  ');
    await userEvent.click(screen.getByRole('button', { name: '选择颜色 #68cbb6' }));
    expect(screen.getByRole('button', { name: '选择颜色 #68cbb6' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '添加分类' }));
    expect(onAddCategory).toHaveBeenLastCalledWith('生活', '#68cbb6');
    expect(screen.getByLabelText('分类名称')).toHaveValue('  生活  ');

    await userEvent.click(screen.getByRole('button', { name: '添加分类' }));
    expect(screen.getByLabelText('分类名称')).toHaveValue('');
  });
});
