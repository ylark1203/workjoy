import type { WorkSchedule } from '../types/models';

export type WorkStatus = 'before' | 'working' | 'lunch' | 'after' | 'off-day';

export interface WorkState {
  status: WorkStatus;
  totalMinutes: number;
  workedMinutes: number;
  workedSeconds: number;
  remainingMinutes: number;
  /** Remaining effective work time, excluding the configured lunch break. */
  remainingSeconds: number;
  progress: number;
  endAt: Date;
}

const MINUTE = 60_000;

export function atTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MINUTE));
}

function secondsBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

export function isWorkDay(date: Date, schedule: WorkSchedule): boolean {
  return schedule.workDays.includes(date.getDay());
}

export function getEffectiveWorkMinutes(schedule: WorkSchedule, date = new Date()): number {
  const start = atTime(date, schedule.startTime);
  const end = atTime(date, schedule.endTime);
  const total = minutesBetween(start, end);
  if (!schedule.lunchStart || !schedule.lunchEnd) return total;
  const lunchStart = atTime(date, schedule.lunchStart);
  const lunchEnd = atTime(date, schedule.lunchEnd);
  return Math.max(0, total - minutesBetween(lunchStart, lunchEnd));
}

export function getWorkState(now: Date, schedule: WorkSchedule): WorkState {
  const start = atTime(now, schedule.startTime);
  const end = atTime(now, schedule.endTime);
  const lunchStart = schedule.lunchStart ? atTime(now, schedule.lunchStart) : undefined;
  const lunchEnd = schedule.lunchEnd ? atTime(now, schedule.lunchEnd) : undefined;
  const totalMinutes = getEffectiveWorkMinutes(schedule, now);
  const totalSeconds = totalMinutes * 60;
  const isTodayWorkday = isWorkDay(now, schedule);
  let status: WorkStatus = 'off-day';
  let workedMinutes = 0;
  let workedSeconds = 0;

  if (isTodayWorkday) {
    if (now < start) status = 'before';
    else if (now >= end) status = 'after';
    else if (lunchStart && lunchEnd && now >= lunchStart && now < lunchEnd) status = 'lunch';
    else status = 'working';

    const elapsedBeforeLunch = lunchStart ? Math.min(secondsBetween(start, lunchStart), secondsBetween(start, now)) : secondsBetween(start, now);
    const elapsedAfterLunch = lunchEnd && now > lunchEnd ? secondsBetween(lunchEnd, now) : 0;
    workedSeconds = Math.min(totalSeconds, elapsedBeforeLunch + elapsedAfterLunch);
    // Keep the established minute-based values for salary/progress compatibility.
    workedMinutes = Math.min(totalMinutes, Math.round(workedSeconds / 60));
  }

  const remainingMinutes = status === 'off-day' || status === 'after' ? 0 : status === 'before' ? totalMinutes : Math.max(0, totalMinutes - workedMinutes);
  const remainingSeconds = status === 'off-day' || status === 'after' ? 0 : status === 'before' ? totalSeconds : Math.max(0, totalSeconds - workedSeconds);
  const progress = totalMinutes ? Math.min(1, Math.max(0, workedMinutes / totalMinutes)) : 0;
  return { status, totalMinutes, workedMinutes, workedSeconds, remainingMinutes, remainingSeconds, progress, endAt: end };
}

export function nextNonWorkday(now: Date, schedule: WorkSchedule): Date | null {
  if (!isWorkDay(now, schedule)) return null;
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 14; i += 1) {
    result.setDate(result.getDate() + 1);
    if (!isWorkDay(result, schedule)) return result;
  }
  return null;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days) return `${days}天 ${hours}小时 ${minutes}分钟`;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(' : ');
}

export function getWeekendCountdown(now: Date, schedule: WorkSchedule): { label: string; seconds: number; weekend: boolean } {
  const nextOff = nextNonWorkday(now, schedule);
  if (!nextOff) return { label: '周末模式 ☕', seconds: 0, weekend: true };
  const seconds = Math.max(0, Math.floor((nextOff.getTime() - now.getTime()) / 1000));
  return { label: formatDuration(seconds), seconds, weekend: false };
}

export function getNextPayday(now: Date, payday: number): Date {
  const safeDay = Math.min(31, Math.max(1, payday));
  const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const dateFor = (year: number, month: number) => new Date(year, month, Math.min(safeDay, lastDayOfMonth(year, month)), 9, 0, 0, 0);
  const thisMonth = dateFor(now.getFullYear(), now.getMonth());
  if (now < thisMonth) return thisMonth;
  return dateFor(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), (now.getMonth() + 1) % 12);
}

export function getPaydayCountdown(now: Date, payday: number): { label: string; seconds: number } {
  const target = getNextPayday(now, payday);
  const seconds = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(seconds / 86_400);
  return { label: `${days}天`, seconds };
}
