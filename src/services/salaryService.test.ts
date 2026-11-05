import { describe, expect, it } from 'vitest';
import { getSalaryPerMinute, getSalarySnapshot, getWorkdaysInMonth } from './salaryService';
import type { SalarySettings, WorkSchedule } from '../types/models';

const schedule: WorkSchedule = { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:30' };
const salary: SalarySettings = { monthlySalary: 10_000, salaryType: 'afterTax', payday: 15 };
const date = (value: string) => new Date(`${value}+08:00`);

describe('SalaryService', () => {
  it('calculates monthly rate using effective work minutes', () => {
    expect(getSalaryPerMinute(salary, schedule, date('2026-08-17T10:00:00'))).toBeGreaterThan(0);
  });

  it('pauses salary during lunch and stops after work', () => {
    const lunch = getSalarySnapshot(date('2026-08-17T12:30:00'), salary, schedule);
    const after = getSalarySnapshot(date('2026-08-17T19:00:00'), salary, schedule);
    expect(lunch.workedMinutes).toBe(180);
    expect(after.workedMinutes).toBe(450);
    expect(after.todayIncome).toBeGreaterThan(lunch.todayIncome);
    expect(getSalarySnapshot(date('2026-08-16T10:00:00'), salary, schedule).todayIncome).toBe(0);
  });

  it('accrues income with second-level precision', () => {
    const snapshot = getSalarySnapshot(date('2026-08-17T10:00:30'), salary, schedule);
    expect(snapshot.todayIncome).toBeCloseTo(snapshot.perSecond * 3_630, 10);
  });

  it('uses configured work days when calculating monthly rates', () => {
    const sundaySchedule: WorkSchedule = { ...schedule, workDays: [0] };
    expect(getWorkdaysInMonth(date('2026-08-01T10:00:00'), [0])).toBe(5);
    expect(getSalaryPerMinute(salary, sundaySchedule, date('2026-08-16T10:00:00'))).toBeGreaterThan(0);
    expect(getSalarySnapshot(date('2026-08-16T10:00:00'), salary, sundaySchedule).active).toBe(true);
  });
});
