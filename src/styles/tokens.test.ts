import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const componentsCss = readFileSync(resolve(process.cwd(), 'src/styles/components.css'), 'utf8');

const tokenEntries = Array.from(tokensCss.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi));
const tokens = new Map(tokenEntries.map((match) => [match[1], match[2].toLowerCase()]));

const channel = (hex: string, offset: number) => {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string) =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);

export const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
};

const getToken = (name: string) => tokens.get(name) ?? '#ffffff';

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const mixRgb = (foreground: Rgb, background: Rgb, foregroundRatio: number): Rgb =>
  foreground.map((value, index) =>
    value * foregroundRatio + background[index] * (1 - foregroundRatio),
  ) as Rgb;

const compositeRgb = (foreground: Rgb, background: Rgb, alpha: number): Rgb =>
  mixRgb(foreground, background, alpha);

const relativeLuminanceRgb = (rgb: Rgb) => {
  const [red, green, blue] = rgb.map((value) => {
    const channelValue = value / 255;
    return channelValue <= 0.04045
      ? channelValue / 12.92
      : ((channelValue + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatioRgb = (foreground: Rgb, background: Rgb) => {
  const foregroundLuminance = relativeLuminanceRgb(foreground);
  const backgroundLuminance = relativeLuminanceRgb(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRuleBody = (selector: string) => {
  const match = componentsCss.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 's'));
  expect(match, `missing real CSS selector: ${selector}`).not.toBeNull();
  return match?.[1] ?? '';
};

const getDeclaration = (selector: string, property: string) => {
  const body = getRuleBody(selector);
  return body.match(new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+)`))?.[1].trim() ?? null;
};

const resolveColor = (value: string): Rgb => {
  if (value === 'white') return toRgb('#ffffff');
  if (value.startsWith('#')) return toRgb(value);
  const tokenName = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  expect(tokenName, `unsupported CSS color: ${value}`).toBeDefined();
  return toRgb(getToken(tokenName ?? 'missing'));
};

const resolveColorMix = (value: string): Rgb => {
  const match = value.match(
    /^color-mix\(in srgb,\s*(var\(--[\w-]+\)|#[0-9a-f]{6})\s+([\d.]+)%,\s*(white|#[0-9a-f]{6})\)$/i,
  );
  expect(match, `unsupported CSS color-mix: ${value}`).not.toBeNull();
  return mixRgb(resolveColor(match?.[1] ?? '#ffffff'), resolveColor(match?.[3] ?? '#ffffff'), Number(match?.[2]) / 100);
};

const completedContrast = (foregroundSelector: string) => {
  const backdrop = toRgb(getToken('color-bg'));
  const opacity = Number(getDeclaration('.task-item.is-complete', 'opacity') ?? '1');
  const background = resolveColorMix(getDeclaration('.task-item.is-complete', 'background') ?? '');
  const foreground = resolveColor(getDeclaration(foregroundSelector, 'color') ?? '');
  return contrastRatioRgb(
    compositeRgb(foreground, backdrop, opacity),
    compositeRgb(background, backdrop, opacity),
  );
};

describe('accessible color tokens', () => {
  it('keeps white normal text AA-compliant on coral and mint surfaces', () => {
    expect(contrastRatio('#ffffff', getToken('color-coral'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', getToken('color-mint'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps essential control boundaries at three-to-one against surfaces', () => {
    expect(tokens.has('color-control-border')).toBe(true);
    expect(contrastRatio(getToken('color-control-border'), getToken('color-surface'))).toBeGreaterThanOrEqual(3);
    expect(componentsCss.match(/var\(--color-control-border\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('provides a three-to-one light focus indicator on dark snackbars', () => {
    expect(tokens.has('color-focus-on-dark')).toBe(true);
    expect(contrastRatio(getToken('color-focus-on-dark'), getToken('color-ink'))).toBeGreaterThanOrEqual(3);
    expect(componentsCss).toMatch(/\.snackbar\s+button:focus-visible\s*\{[^}]*var\(--color-focus-on-dark\)/s);
  });

  it('keeps real progress muted text AA-compliant on its panel background', () => {
    const foreground = resolveColor(getDeclaration('.progress-panel p', 'color') ?? '');
    const background = resolveColor(getDeclaration('.progress-panel', 'background') ?? '');

    expect(contrastRatioRgb(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps completed task metadata AA-compliant after real group alpha compositing', () => {
    expect(completedContrast('.task-item p')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps completed category text AA-compliant after real group alpha compositing', () => {
    expect(completedContrast('.task-category')).toBeGreaterThanOrEqual(4.5);
  });

  it('fades only the completed title instead of the entire task card', () => {
    expect(getDeclaration('.task-item.is-complete', 'opacity')).toBeNull();
    expect(getDeclaration('.task-item.is-complete s', 'color')).toBe('var(--color-muted)');
    expect(completedContrast('.task-item.is-complete s')).toBeGreaterThanOrEqual(4.5);
  });

  it('gives disabled snackbar actions a clear visual and cursor treatment', () => {
    expect(Number(getDeclaration('.snackbar button:disabled', 'opacity'))).toBeLessThan(1);
    expect(getDeclaration('.snackbar button:disabled', 'cursor')).toBe('not-allowed');
  });
});
