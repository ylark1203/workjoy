import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { defaultSettings } from './types/models';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false }) });
  root = null;
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container.remove();
  vi.useRealTimers();
});

async function renderApp() {
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(App));
  });
}

function getButton(text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent?.includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

describe('App interactions', () => {
  it('allows setup to finish with unconfirmed deduction data and shows an estimate warning', async () => {
    await renderApp();
    await act(async () => getButton('继续').click());

    expect(container.textContent).toContain('社保个人比例');
    expect(container.textContent).toContain('公积金个人比例');
    expect(container.textContent).toContain('实时工资可能不准确，但不影响软件正常使用');

    await act(async () => getButton('开始使用 WorkJoy').click());

    expect(container.textContent).toContain('今日概览');
    expect(container.textContent).toContain('扣款待确认，仅供参考');
  });

  it('updates today income immediately after salary edits without restarting', async () => {
    localStorage.setItem('workjoy-settings', JSON.stringify({
      ...defaultSettings,
      configured: true,
      schedule: { ...defaultSettings.schedule, workDays: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59', lunchStart: undefined, lunchEnd: undefined },
      salary: { ...defaultSettings.salary, monthlySalary: 1_000_000, salaryType: 'afterTax', deductionsEstimated: false }
    }));
    await renderApp();
    const initialIncome = container.querySelector('.income-number')?.textContent;
    const initialRate = container.querySelector('.income-card p')?.textContent;

    await act(async () => getButton('设置').click());
    const salaryLabel = Array.from(container.querySelectorAll('.form-grid label')).find((label) => label.textContent?.includes('税后月薪'));
    const input = salaryLabel?.querySelector('input');
    if (!input) throw new Error('Salary input not found');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(input, '2000000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => getButton('今日概览').click());

    expect(container.querySelector('.income-number')?.textContent).not.toBe(initialIncome);
    expect(container.querySelector('.income-card p')?.textContent).not.toBe(initialRate);
  });

  it('shows a fading income increment every 200 milliseconds during work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T10:00:00+08:00'));
    localStorage.setItem('workjoy-settings', JSON.stringify({
      ...defaultSettings,
      configured: true,
      salary: { ...defaultSettings.salary, monthlySalary: 1_000_000, salaryType: 'afterTax', deductionsEstimated: false }
    }));
    await renderApp();
    expect(container.querySelector('.income-delta')).toBeNull();

    await act(async () => vi.advanceTimersByTime(200));

    const firstDelta = container.querySelector('.income-delta');
    expect(firstDelta?.textContent).toMatch(/^\+¥/);
    await act(async () => vi.advanceTimersByTime(200));
    const nextDelta = container.querySelector('.income-delta');
    expect(nextDelta?.textContent).toMatch(/^\+¥/);
    expect(nextDelta).not.toBe(firstDelta);
  });
});
