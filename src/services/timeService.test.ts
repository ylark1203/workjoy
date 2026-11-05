import { describe, expect, it } from 'vitest';
import { formatDuration, getNextPayday, getWorkState, getWeekendCountdown } from './timeService';
import type { WorkSchedule } from '../types/models';

const schedule: WorkSchedule = { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:30' };
const date = (value: string) => new Date(`${value}+08:00`);

describe('TimeService', () => {
  it('handles before work, working, lunch and after work', () => {
    expect(getWorkState(date('2026-08-17T08:30:00'), schedule).status).toBe('before');
    expect(getWorkState(date('2026-08-17T10:00:00'), schedule).workedMinutes).toBe(60);
    expect(getWorkState(date('2026-08-17T12:30:00'), schedule).status).toBe('lunch');
    expect(getWorkState(date('2026-08-17T12:30:00'), schedule).workedMinutes).toBe(180);
    expect(getWorkState(date('2026-08-17T19:00:00'), schedule).progress).toBe(1);
  });

  it('recognises non-working days and weekend countdown', () => {
    expect(getWorkState(date('2026-08-16T10:00:00'), schedule).status).toBe('off-day');
    expect(getWeekendCountdown(date('2026-08-15T10:00:00'), schedule).weekend).toBe(true);
    expect(getWeekendCountdown(date('2026-08-14T10:00:00'), schedule).seconds).toBeGreaterThan(0);
  });

  it('keeps sub-minute precision for the workday countdown', () => {
    const state = getWorkState(date('2026-08-17T10:00:30'), schedule);
    expect(state.remainingSeconds).toBe(23_370);
    expect(formatDuration(state.remainingSeconds)).toBe('06 : 29 : 30');
  });

  it('clamps payday to the last day of short months', () => {
    expect(getNextPayday(date('2026-02-01T10:00:00'), 31).getDate()).toBe(28);
    expect(getNextPayday(date('2024-02-01T10:00:00'), 31).getDate()).toBe(29);
    expect(getNextPayday(date('2026-04-01T10:00:00'), 31).getDate()).toBe(30);
  });
});
