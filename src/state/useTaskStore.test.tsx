import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSnapshot, type TaskRepository } from '../storage/taskRepository';
import { useTaskStore } from './useTaskStore';

describe('useTaskStore', () => {
  it('does not commit UI state when persistence fails', () => {
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save: vi.fn(() => {
        throw new Error('quota');
      }),
    };
    const { result } = renderHook(() => useTaskStore(repository));
    let created: boolean | undefined;

    act(() => {
      created = result.current.createTask({
        title: '阅读',
        date: '2026-07-20',
        priority: 'medium',
        categoryId: 'growth',
        notes: '',
      });
    });

    expect(created).toBe(false);
    expect(result.current.snapshot.tasks).toHaveLength(0);
    expect(result.current.error).toBe('保存失败，内容尚未写入浏览器');
  });

  it('restores a deleted task with undo', () => {
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save: vi.fn(),
    };
    const { result } = renderHook(() => useTaskStore(repository));

    act(() => result.current.createTask({ title: '阅读', date: '2026-07-20', priority: 'medium', categoryId: null, notes: '' }));
    const id = result.current.snapshot.tasks[0].id;
    act(() => result.current.deleteTask(id));
    act(() => result.current.undoLastAction());

    expect(result.current.snapshot.tasks[0].title).toBe('阅读');
  });

  it('uses the latest committed snapshot for consecutive mutations before a rerender', () => {
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save: vi.fn(),
    };
    const { result } = renderHook(() => useTaskStore(repository));

    act(() => {
      result.current.createTask({ title: '任务 A', date: '2026-07-20', priority: 'medium', categoryId: null, notes: '' });
      result.current.createTask({ title: '任务 B', date: '2026-07-20', priority: 'high', categoryId: null, notes: '' });
    });

    expect(result.current.snapshot.tasks.map((task) => task.title)).toEqual(['任务 A', '任务 B']);
  });

  it('consumes an undo after it succeeds', () => {
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save: vi.fn(),
    };
    const { result } = renderHook(() => useTaskStore(repository));
    act(() => result.current.createTask({ title: '单次撤销', date: '2026-07-20', priority: 'medium', categoryId: null, notes: '' }));
    const id = result.current.snapshot.tasks[0].id;
    act(() => result.current.toggleTask(id));

    let firstUndo: boolean | undefined;
    let secondUndo: boolean | undefined;
    act(() => {
      firstUndo = result.current.undoLastAction();
      secondUndo = result.current.undoLastAction();
    });

    expect(firstUndo).toBe(true);
    expect(secondUndo).toBe(false);
    expect(result.current.snapshot.tasks[0].completed).toBe(false);
  });

  it('invalidates a stale delete undo after a later task is saved', () => {
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save: vi.fn(),
    };
    const { result } = renderHook(() => useTaskStore(repository));

    act(() => {
      result.current.createTask({ title: '旧任务', date: '2026-07-20', priority: 'medium', categoryId: null, notes: '' });
    });
    const deletedId = result.current.snapshot.tasks[0].id;
    act(() => {
      result.current.deleteTask(deletedId);
    });
    act(() => {
      result.current.createTask({ title: '后续任务', date: '2026-07-20', priority: 'high', categoryId: 'work', notes: '' });
    });

    let undone: boolean | undefined;
    act(() => {
      undone = result.current.undoLastAction();
    });

    expect(undone).toBe(false);
    expect(result.current.snapshot.tasks.map((task) => task.title)).toEqual(['后续任务']);
  });

  it.each(['create', 'update', 'addCategory'] as const)(
    'keeps the current undo when a later %s mutation fails to save',
    (mutation) => {
      let failNextSave = false;
      const repository: TaskRepository = {
        load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
        save: vi.fn(() => {
          if (failNextSave) {
            failNextSave = false;
            throw new Error('quota');
          }
        }),
      };
      const { result } = renderHook(() => useTaskStore(repository));
      const draft = {
        title: '原任务',
        date: '2026-07-20',
        priority: 'medium' as const,
        categoryId: null,
        notes: '',
      };

      act(() => {
        result.current.createTask(draft);
      });
      const id = result.current.snapshot.tasks[0].id;
      act(() => {
        result.current.toggleTask(id);
      });

      let saved: boolean | undefined;
      act(() => {
        failNextSave = true;
        if (mutation === 'create') saved = result.current.createTask({ ...draft, title: '新任务' });
        if (mutation === 'update') saved = result.current.updateTask(id, { ...draft, title: '新标题' });
        if (mutation === 'addCategory') saved = result.current.addCategory('新分类', '#ffffff');
      });

      expect(saved).toBe(false);
      expect(result.current.snapshot.tasks).toHaveLength(1);
      expect(result.current.snapshot.tasks[0]).toMatchObject({ title: '原任务', completed: true });
      expect(result.current.snapshot.categories).toHaveLength(3);

      let undone: boolean | undefined;
      act(() => {
        undone = result.current.undoLastAction();
      });
      expect(undone).toBe(true);
      expect(result.current.snapshot.tasks[0]).toMatchObject({ title: '原任务', completed: false });
    },
  );

  it('keeps the deleted UI state and undo snapshot when undo persistence fails', () => {
    let saveCall = 0;
    const save = vi.fn(() => {
      saveCall += 1;
      if (saveCall === 3) throw new Error('quota');
    });
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save,
    };
    const { result } = renderHook(() => useTaskStore(repository));

    act(() => {
      result.current.createTask({ title: '阅读', date: '2026-07-20', priority: 'medium', categoryId: null, notes: '' });
    });
    const id = result.current.snapshot.tasks[0].id;
    act(() => {
      result.current.deleteTask(id);
    });

    let firstUndo: boolean | undefined;
    act(() => {
      firstUndo = result.current.undoLastAction();
    });
    expect(firstUndo).toBe(false);
    expect(result.current.snapshot.tasks).toHaveLength(0);
    expect(result.current.error).toBe('撤销失败，当前内容未改变');

    let retryUndo: boolean | undefined;
    act(() => {
      retryUndo = result.current.undoLastAction();
    });
    expect(retryUndo).toBe(true);
    expect(result.current.snapshot.tasks[0].title).toBe('阅读');
  });

  it('rejects missing task ids without saving or replacing the undo snapshot', () => {
    const save = vi.fn();
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save,
    };
    const { result } = renderHook(() => useTaskStore(repository));
    const draft = { title: '阅读', date: '2026-07-20', priority: 'medium' as const, categoryId: null, notes: '' };

    act(() => {
      result.current.createTask(draft);
    });
    const id = result.current.snapshot.tasks[0].id;
    act(() => {
      result.current.deleteTask(id);
    });
    expect(save).toHaveBeenCalledTimes(2);

    let updated: boolean | undefined;
    let toggled: boolean | undefined;
    let deleted: boolean | undefined;
    act(() => {
      updated = result.current.updateTask('missing', draft);
      toggled = result.current.toggleTask('missing');
      deleted = result.current.deleteTask('missing');
    });
    expect(updated).toBe(false);
    expect(toggled).toBe(false);
    expect(deleted).toBe(false);
    expect(save).toHaveBeenCalledTimes(2);

    let undone: boolean | undefined;
    act(() => {
      undone = result.current.undoLastAction();
    });
    expect(undone).toBe(true);
    expect(result.current.snapshot.tasks[0].id).toBe(id);
  });

  it('returns false for invalid categories and when there is nothing to undo', () => {
    const save = vi.fn();
    const repository: TaskRepository = {
      load: () => ({ snapshot: createDefaultSnapshot(), warning: null }),
      save,
    };
    const { result } = renderHook(() => useTaskStore(repository));

    let emptyCategory: boolean | undefined;
    let duplicateCategory: boolean | undefined;
    let undone: boolean | undefined;
    act(() => {
      emptyCategory = result.current.addCategory('  ', '#ffffff');
      duplicateCategory = result.current.addCategory('  工作  ', '#ffffff');
      undone = result.current.undoLastAction();
    });

    expect(emptyCategory).toBe(false);
    expect(duplicateCategory).toBe(false);
    expect(undone).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});
