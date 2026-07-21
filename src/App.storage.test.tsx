import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.resetModules();
});

it('renders a warning and rolls back saves when the localStorage getter throws', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError');
    },
  });

  let App: typeof import('./App').App;
  try {
    vi.resetModules();
    ({ App } = await import('./App'));
  } finally {
    if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
  }

  render(<App initialToday="2026-07-20" />);
  expect(screen.getByRole('main')).toBeVisible();
  expect(screen.getByText('无法读取本地存储，已载入空清单；当前更改将无法保存')).toBeVisible();

  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('任务标题'), '不会假装保存');
  await user.click(screen.getByRole('button', { name: '保存任务' }));

  expect(screen.getByRole('dialog', { name: '新建任务' })).toBeVisible();
  expect(screen.getByText('保存失败，内容尚未写入浏览器')).toBeVisible();
  expect(screen.queryByText('不会假装保存', { selector: '.task-item *' })).not.toBeInTheDocument();
});
