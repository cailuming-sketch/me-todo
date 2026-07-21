import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import type { DateKey } from '../../domain/date';
import { validateTaskDraft } from '../../domain/taskLogic';
import type { Category, Priority, Task, TaskDraft } from '../../domain/task';
import { trapTab } from '../trapTab';

interface TaskDrawerProps {
  open: boolean;
  selectedDate: DateKey;
  categories: Category[];
  task: Task | null;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onSave: (draft: TaskDraft) => boolean;
  onAddCategory: (name: string, color: string) => boolean;
  onClose: () => void;
}

const presetColors = ['#ff847c', '#68cbb6', '#f1bd3e', '#7f8cff'] as const;

const emptyDraft = (date: DateKey): TaskDraft => ({
  title: '',
  date,
  priority: 'medium',
  categoryId: null,
  notes: '',
});

const draftFromTask = (task: Task): TaskDraft => ({
  title: task.title,
  date: task.date,
  priority: task.priority,
  categoryId: task.categoryId,
  notes: task.notes,
});

export function TaskDrawer({
  open,
  selectedDate,
  categories,
  task,
  fallbackFocusRef,
  onSave,
  onAddCategory,
  onClose,
}: TaskDrawerProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => (task ? draftFromTask(task) : emptyDraft(selectedDate)));
  const [errors, setErrors] = useState<ReturnType<typeof validateTaskDraft>>({});
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState<(typeof presetColors)[number]>('#ff847c');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(task ? draftFromTask(task) : emptyDraft(selectedDate));
    setErrors({});
    setCategoryName('');
    setCategoryColor('#ff847c');
  }, [open, selectedDate, task]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    titleInputRef.current?.focus();
    return () => {
      const focusTarget = previousFocus?.isConnected
        ? previousFocus
        : fallbackFocusRef?.current?.isConnected
          ? fallbackFocusRef.current
          : null;
      focusTarget?.focus();
    };
  }, [fallbackFocusRef, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = {
      ...draft,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
    };
    const nextErrors = validateTaskDraft(normalized);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0 && onSave(normalized)) onClose();
  };

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-drawer-title"
      className="task-drawer"
      onKeyDown={trapTab}
    >
      <form onSubmit={submit}>
        <h2 id="task-drawer-title">{task ? '编辑任务' : '新建任务'}</h2>

        <label>
          任务标题
          <input
            ref={titleInputRef}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        {errors.title && <p role="alert">{errors.title}</p>}

        <label>
          日期
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
        </label>
        {errors.date && <p role="alert">{errors.date}</p>}

        <label>
          优先级
          <select
            value={draft.priority}
            onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>

        <label>
          分类
          <select
            value={draft.categoryId ?? ''}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value || null })}
          >
            <option value="">未分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          备注
          <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>

        <fieldset>
          <legend>新建分类</legend>
          <label>
            分类名称
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          </label>
          <div>
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`选择颜色 ${color}`}
                aria-pressed={categoryColor === color}
                style={{ backgroundColor: color }}
                onClick={() => setCategoryColor(color)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (onAddCategory(categoryName.trim(), categoryColor)) setCategoryName('');
            }}
          >
            添加分类
          </button>
        </fieldset>

        <button type="button" onClick={onClose}>
          取消
        </button>
        <button type="submit">保存任务</button>
      </form>
    </aside>
  );
}
