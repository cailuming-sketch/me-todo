import type { KeyboardEvent } from 'react';

export const trapTab = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== 'Tab') return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      ':is(button, input, select, textarea, [tabindex]):not(:disabled):not([tabindex="-1"])',
    ),
  ).filter((element) => {
    let current: HTMLElement | null = element;
    while (current && current !== event.currentTarget) {
      const style = window.getComputedStyle(current);
      if (
        current.hidden ||
        current.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      ) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  });
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};
