export type ThemeMode = 'light' | 'dark' | 'system';
export type SalaryType = 'preTax' | 'afterTax';
export type CloseBehavior = 'ask' | 'minimize' | 'exit' | 'minimal';
export type MiniContentKey = 'offTime' | 'income' | 'progress' | 'weekend' | 'payday' | 'clock';
export type AppPage = 'dashboard' | 'reader' | 'settings';

export const miniContentOptions: { key: MiniContentKey; label: string }[] = [
  { key: 'offTime', label: '距离下班' },
  { key: 'income', label: '今日工资' },
  { key: 'progress', label: '今日进度' },
  { key: 'weekend', label: '距离周末' },
  { key: 'payday', label: '距离发薪' },
  { key: 'clock', label: '当前时间' }
];

export interface WorkSchedule {
  workDays: number[];
  startTime: string;
  endTime: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface SalarySettings {
  monthlySalary: number;
  salaryType: SalaryType;
  payday: number;
  socialInsuranceRate: number;
  housingFundRate: number;
  otherDeductions: number;
  estimatedMonthlyTax: number;
  deductionsEstimated: boolean;
}

export interface ReminderSettings {
  waterEnabled: boolean;
  waterIntervalMinutes: number;
  sittingEnabled: boolean;
  sittingIntervalMinutes: number;
  eyeEnabled: boolean;
  eyeIntervalMinutes: number;
}

export interface ReaderSettings {
  fontFamily: string;
  fontSize: number;
  opacity: number;
  autoScrollSeconds: number;
}

export interface ReaderState {
  filePath?: string;
  fileName?: string;
  paragraphs: string[];
  currentParagraph: number;
  lastReadAt?: string;
}

export interface AppSettings {
  configured: boolean;
  schedule: WorkSchedule;
  salary: SalarySettings;
  reminders: ReminderSettings;
  reader: ReaderSettings;
  readerState: ReaderState;
  theme: ThemeMode;
  launchAtStartup: boolean;
  startInMiniMode: boolean;
  globalShortcut: string;
  closeBehavior: CloseBehavior;
  miniMode: {
    items: MiniContentKey[];
    clickThrough: boolean;
  };
}

export const defaultSettings: AppSettings = {
  configured: false,
  schedule: { workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:30' },
  salary: {
    monthlySalary: 10000,
    salaryType: 'preTax',
    payday: 15,
    socialInsuranceRate: 0,
    housingFundRate: 0,
    otherDeductions: 0,
    estimatedMonthlyTax: 0,
    deductionsEstimated: true
  },
  reminders: {
    waterEnabled: true,
    waterIntervalMinutes: 45,
    sittingEnabled: true,
    sittingIntervalMinutes: 60,
    eyeEnabled: true,
    eyeIntervalMinutes: 30
  },
  reader: { fontFamily: 'Noto Sans SC Variable', fontSize: 18, opacity: 0.94, autoScrollSeconds: 8 },
  readerState: { paragraphs: [], currentParagraph: 0 },
  theme: 'system',
  launchAtStartup: false,
  startInMiniMode: false,
  globalShortcut: 'CommandOrControl+Alt+H',
  closeBehavior: 'ask',
  miniMode: { items: ['offTime', 'income'], clickThrough: false }
};
