import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { trapTab } from './trapTab';

it('wraps between visible enabled controls and skips hidden or disabled boundaries', async () => {
  const user = userEvent.setup();
  render(
    <div onKeyDown={trapTab}>
      <button type="button" hidden>隐藏首项</button>
      <button type="button" disabled>禁用首项</button>
      <div hidden>
        <button type="button">隐藏祖先中的首项</button>
      </div>
      <div aria-hidden="true">
        <button type="button">ARIA 隐藏祖先中的首项</button>
      </div>
      <button type="button">首个可用</button>
      <button type="button">末个可用</button>
      <div aria-hidden="true">
        <button type="button">ARIA 隐藏祖先中的末项</button>
      </div>
      <div hidden>
        <button type="button">隐藏祖先中的末项</button>
      </div>
      <button type="button" disabled>禁用末项</button>
      <button type="button" hidden>隐藏末项</button>
    </div>,
  );
  const first = screen.getByRole('button', { name: '首个可用' });
  const last = screen.getByRole('button', { name: '末个可用' });

  first.focus();
  await user.tab({ shift: true });
  expect(last).toHaveFocus();

  await user.tab();
  expect(first).toHaveFocus();
});
