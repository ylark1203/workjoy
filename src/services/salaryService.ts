import type { SalarySettings, WorkSchedule } from '../types/models';
import { getEffectiveWorkMinutes, getWorkState } from './timeService';

/**
 * China's statutory monthly salary conversion basis:
 * (365 calendar days - 104 rest days) / 12 months = 21.75 days.
 * Legal public holidays remain paid days and are therefore not subtracted.
 */
export const MONTHLY_SALARY_DAYS = 21.75;

export interface SalarySnapshot {
  perMinute: number;
  perSecond: number;
  todayIncome: number;
  workedMinutes: number;
  active: boolean;
}

export function getWorkdaysInMonth(date: Date, workDays: number[] = [1, 2, 3, 4, 5]): number {
  const allowedDays = new Set(workDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  let count = 0;
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  while (cursor.getMonth() === date.getMonth()) {
    const day = cursor.getDay();
    if (allowedDays.has(day)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function getEstimatedNetMonthlySalary(salary: SalarySettings): number {
  const monthlySalary = Math.max(0, salary.monthlySalary);
  if (salary.salaryType === 'afterTax') return monthlySalary;
  const socialInsuranceRate = Math.min(100, Math.max(0, salary.socialInsuranceRate));
  const housingFundRate = Math.min(100, Math.max(0, salary.housingFundRate));
  const socialInsurance = monthlySalary * socialInsuranceRate / 100;
  const housingFund = monthlySalary * housingFundRate / 100;
  const otherDeductions = Math.max(0, salary.otherDeductions);
  const estimatedMonthlyTax = Math.max(0, salary.estimatedMonthlyTax);
  return Math.max(0, monthlySalary - socialInsurance - housingFund - otherDeductions - estimatedMonthlyTax);
}

export function getSalaryPerMinute(salary: SalarySettings, schedule: WorkSchedule, date = new Date()): number {
  const minutesPerWorkday = getEffectiveWorkMinutes(schedule, date);
  return minutesPerWorkday > 0
    ? getEstimatedNetMonthlySalary(salary) / (MONTHLY_SALARY_DAYS * minutesPerWorkday)
    : 0;
}

export function getSalarySnapshot(now: Date, salary: SalarySettings, schedule: WorkSchedule): SalarySnapshot {
  const state = getWorkState(now, schedule);
  const perMinute = getSalaryPerMinute(salary, schedule, now);
  const perSecond = perMinute / 60;
  // Calculate from elapsed seconds so the displayed income advances every second.
  return { perMinute, perSecond, todayIncome: state.workedSeconds * perSecond, workedMinutes: state.workedMinutes, active: state.status === 'working' };
}

export function formatMoney(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(Math.max(0, value));
}
