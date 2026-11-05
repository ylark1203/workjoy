import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { enable, disable } from '@tauri-apps/plugin-autostart';

const isTauri = () => '__TAURI_INTERNALS__' in window;

export async function notify(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  let permission = await isPermissionGranted();
  if (!permission) permission = (await requestPermission()) === 'granted';
  if (permission) sendNotification({ title, body });
}

export async function chooseTextFile(): Promise<{ path: string; name: string; text: string } | null> {
  if (!isTauri()) return null;
  const selected = await open({ multiple: false, filters: [{ name: 'Text', extensions: ['txt'] }] });
  if (!selected || Array.isArray(selected)) return null;
  const text = await readTextFile(selected);
  const name = selected.split(/[\\/]/).pop() || '未命名.txt';
  return { path: selected, name, text };
}

export async function toggleWindow(): Promise<void> {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  if (await window.isVisible()) await window.hide(); else await window.show();
}

export async function hideMainWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke('hide_main_window');
}

export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  await invoke('quit_app');
}

export async function showMiniWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke('show_mini_window');
}

export type MiniMenuSide = 'left' | 'right';

export function getMiniMenuSide(clientX: number, widgetLeft: number, widgetWidth: number): MiniMenuSide {
  return clientX < widgetLeft + widgetWidth / 2 ? 'left' : 'right';
}

export async function showMiniMenu(side: MiniMenuSide = 'right'): Promise<void> {
  if (!isTauri()) return;
  await invoke('show_mini_menu', { side });
}

export async function hideMiniMenu(): Promise<void> {
  if (!isTauri()) return;
  await invoke('hide_mini_menu');
}

export async function setMiniClickThrough(clickThrough: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke('set_mini_click_through', { clickThrough });
}

export async function openMainWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke('open_main_window');
}

export async function resizeMiniWindow(width: number, height: number): Promise<void> {
  if (!isTauri()) return;
  await invoke('resize_mini_window', { width: Math.ceil(width), height: Math.ceil(height) });
}

export async function resizeMiniMenuWindow(width: number, height: number): Promise<void> {
  if (!isTauri()) return;
  await invoke('resize_mini_menu_window', { width: Math.ceil(width), height: Math.ceil(height) });
}

export async function setGlobalShortcut(shortcut: string, onToggle: () => void): Promise<void> {
  if (!isTauri()) return;
  try { await unregister(shortcut); } catch { /* shortcut may not exist */ }
  await register(shortcut, onToggle);
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  if (enabled) await enable(); else await disable();
}

export async function showReaderWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke('show_reader_window');
}
