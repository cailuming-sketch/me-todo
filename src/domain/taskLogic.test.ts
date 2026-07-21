import { describe, expect, it } from 'vitest';
import type { Task } from './task';
import { calculateProgress, sortTasks, validateTaskDraft } from './taskLogic';

const task = (id: string, priority: Task['priority'], completed = false): Task => ({
  id,
  title: id,
  date: '2026-07-20',
  priority,
  categoryId: null,
  notes: '',
  completed,
  createdAt: `2026-07-20T0${id}:00:00Z`,
  updatedAt: `2026-07-20T0${id}:00:00Z`,
});

describe('task rules', () => {
  it('requires a trimmed title and valid date', () => {
    expect(validateTaskDraft({ title: '  ', date: 'bad', priority: 'medium', categoryId: null, notes: '' })).toEqual({
      title: '请输入任务标题',
      date: '请选择有效日期',
    });
  });

  it('sorts unfinished tasks by priority then creation time', () => {
    expect(sortTasks([task('2', 'low'), task('1', 'high')]).map((item) => item.id)).toEqual(['1', '2']);
  });

  it('calculates progress from all daily tasks', () => {
    expect(calculateProgress([task('1', 'high', true), task('2', 'low')])).toEqual({ completed: 1, total: 2, percent: 50 });
    expect(calculateProgress([])).toEqual({ completed: 0, total: 0, percent: null });
  });
});
