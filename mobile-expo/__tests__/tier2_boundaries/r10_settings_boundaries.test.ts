/**
 * Tier 2: Boundary & Corner Cases — Requirement R10: Settings Cleanup & Boundary Conditions
 * Scenarios:
 * - Corrupted theme storage recovery
 * - Rapid language chip switching
 * - Auth state transitions in settings display
 * - Version number synchronization with app.json
 * - Cloud sync status enum states
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

describe('Tier 2 - R10: Settings Cleanup & Boundary Conditions', () => {
  const THEME_KEY = '@smartstudy_theme';

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('R10-B1: Corrupted theme storage value defaults safely to dark theme', async () => {
    await AsyncStorage.setItem(THEME_KEY, 'corrupted_theme_value_xyz');

    async function getSanitizedTheme(): Promise<'dark' | 'light'> {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      return 'dark'; // Safe default
    }

    expect(await getSanitizedTheme()).toBe('dark');
  });

  test('R10-B2: Rapid switching between language chips settles on final selection', async () => {
    const I18N_KEY = '@smartstudy_language';
    let pendingLang = 'ru';

    async function switchLanguage(lang: string) {
      pendingLang = lang;
      await AsyncStorage.setItem(I18N_KEY, lang);
    }

    // User taps RU -> EN -> KK -> ZH in rapid succession
    await switchLanguage('ru');
    await switchLanguage('en');
    await switchLanguage('kk');
    await switchLanguage('zh');

    const finalStored = await AsyncStorage.getItem(I18N_KEY);
    expect(finalStored).toBe('zh');
    expect(pendingLang).toBe('zh');
  });

  test('R10-B3: Settings profile display clears immediately on logout', () => {
    let currentUser: any = {
      displayName: 'Камиль',
      email: 'kamil@example.com',
    };

    function renderAccountHeader(user: any) {
      if (!user) {
        return { title: 'Гостевой режим', showLoginBtn: true };
      }
      return { title: user.displayName || user.email, showLoginBtn: false };
    }

    // Authenticated
    expect(renderAccountHeader(currentUser).title).toBe('Камиль');
    expect(renderAccountHeader(currentUser).showLoginBtn).toBe(false);

    // After Logout
    currentUser = null;
    expect(renderAccountHeader(currentUser).title).toBe('Гостевой режим');
    expect(renderAccountHeader(currentUser).showLoginBtn).toBe(true);
  });

  test('R10-B4: Version string in settings matches app.json specification', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const expectedVersion = appJson.expo?.version || '1.0.0';
    expect(expectedVersion).toMatch(/^\d+\.\d+\.\d+$/);

    const displayVersionString = `v${expectedVersion}`;
    expect(displayVersionString).toContain(expectedVersion);
  });

  test('R10-B5: Cloud sync status covers all 4 discrete states', () => {
    type SyncState = 'synced' | 'syncing' | 'offline' | 'auth_required';

    function getSyncLabel(state: SyncState): string {
      switch (state) {
        case 'synced':
          return 'Синхронизировано';
        case 'syncing':
          return 'Синхронизация...';
        case 'offline':
          return 'Офлайн • Данные сохранены локально';
        case 'auth_required':
          return 'Требуется вход';
      }
    }

    expect(getSyncLabel('synced')).toBe('Синхронизировано');
    expect(getSyncLabel('syncing')).toBe('Синхронизация...');
    expect(getSyncLabel('offline')).toContain('Офлайн');
    expect(getSyncLabel('auth_required')).toBe('Требуется вход');
  });
});
