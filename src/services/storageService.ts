import { Store } from '@tauri-apps/plugin-store';
import { defaultSettings, type AppSettings } from '../types/models';

const KEY = 'settings';
const isTauri = () => '__TAURI_INTERNALS__' in window;

export async function loadSettings(): Promise<AppSettings> {
  if (isTauri()) {
    const store = await Store.load('workjoy-settings.json', { autoSave: true, defaults: {} });
    const saved = await store.get<Partial<AppSettings>>(KEY);
    return mergeSettings(saved);
  }
  try {
    const saved = JSON.parse(localStorage.getItem('workjoy-settings') || 'null') as Partial<AppSettings> | null;
    return mergeSettings(saved);
  } catch {
    return structuredClone(defaultSettings);
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isTauri()) {
    const store = await Store.load('workjoy-settings.json', { autoSave: true, defaults: {} });
    await store.set(KEY, settings);
    await store.save();
    return;
  }
  localStorage.setItem('workjoy-settings', JSON.stringify(settings));
}

function mergeSettings(saved?: Partial<AppSettings> | null): AppSettings {
  const savedSchedule = saved?.schedule;
  const workDays = Array.isArray(savedSchedule?.workDays)
    ? savedSchedule.workDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    : defaultSettings.schedule.workDays;
  const savedReaderState = saved?.readerState;
  const paragraphs = Array.isArray(savedReaderState?.paragraphs)
    ? savedReaderState.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === 'string')
    : defaultSettings.readerState.paragraphs;
  const rawParagraph = savedReaderState?.currentParagraph;
  const currentParagraph = Number.isInteger(rawParagraph)
    ? Math.max(0, Math.min(Math.max(0, paragraphs.length - 1), rawParagraph as number))
    : defaultSettings.readerState.currentParagraph;
  return {
    ...structuredClone(defaultSettings),
    ...saved,
    schedule: { ...defaultSettings.schedule, ...savedSchedule, workDays },
    salary: { ...defaultSettings.salary, ...saved?.salary },
    reminders: { ...defaultSettings.reminders, ...saved?.reminders },
    reader: { ...defaultSettings.reader, ...saved?.reader },
    readerState: { ...defaultSettings.readerState, ...savedReaderState, paragraphs, currentParagraph },
    miniMode: {
      items: saved?.miniMode?.items ?? defaultSettings.miniMode.items,
      clickThrough: saved?.miniMode?.clickThrough ?? defaultSettings.miniMode.clickThrough
    }
  };
}
