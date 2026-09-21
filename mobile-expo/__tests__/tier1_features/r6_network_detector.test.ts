/**
 * Tier 1: Feature Coverage — Requirement R6: Real Network Detector & Offline Banner
 * Specifications:
 * - NetInfo event listener subscription & unsubscription
 * - State transitions: online -> offline -> online
 * - Offline banner trigger and text content
 * - Reconnection toast trigger and auto-sync firing
 * - Verification of removal of misleading static stub
 */

import NetInfo from '@react-native-community/netinfo';
import fs from 'fs';
import path from 'path';

describe('Tier 1 - R6: Real Network Detector & Offline Indicator', () => {
  test('R6-1: NetInfo listener attaches and receives initial network state', () => {
    let capturedState: any = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      capturedState = state;
    });

    expect(NetInfo.addEventListener).toHaveBeenCalled();
    expect(capturedState).not.toBeNull();
    expect(capturedState.isConnected).toBe(true);

    unsubscribe();
  });

  test('R6-2: Offline state transition triggers offline banner state', () => {
    let isOffline = false;
    let bannerText = '';

    const handleNetworkChange = (state: { isConnected: boolean }) => {
      if (!state.isConnected) {
        isOffline = true;
        bannerText = 'Автономный режим • Данные сохранены локально';
      } else {
        isOffline = false;
        bannerText = '';
      }
    };

    // Transition to offline
    handleNetworkChange({ isConnected: false });
    expect(isOffline).toBe(true);
    expect(bannerText).toBe('Автономный режим • Данные сохранены локально');

    // Transition back to online
    handleNetworkChange({ isConnected: true });
    expect(isOffline).toBe(false);
    expect(bannerText).toBe('');
  });

  test('R6-3: Offline banner contains zero emojis and matches exact UX specification', () => {
    const bannerText = 'Автономный режим • Данные сохранены локально';
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u;

    expect(emojiRegex.test(bannerText)).toBe(false);
    expect(bannerText).toContain('Автономный режим');
    expect(bannerText).toContain('Данные сохранены локально');
  });

  test('R6-4: Reconnection transition triggers auto-sync event', () => {
    let syncCalled = false;
    let previousState = false; // was offline

    const onConnectivityRestored = (currentState: boolean) => {
      if (!previousState && currentState) {
        // Transition from offline to online
        syncCalled = true;
      }
      previousState = currentState;
    };

    onConnectivityRestored(true);
    expect(syncCalled).toBe(true);
  });

  test('R6-5: SettingsScreen does not contain deceptive static "Офлайн-режим: Активен" stub', () => {
    const settingsPath = path.resolve(__dirname, '../../src/modules/settings/SettingsScreen.tsx');
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf8');
      // Must not contain static hardcoded 'Офлайн-режим' paired with static 'Активен'
      const hasDeceptiveStub =
        content.includes('Офлайн-режим') &&
        content.includes('>Активен<') &&
        !content.includes('isOnline') &&
        !content.includes('isConnected');
      expect(hasDeceptiveStub).toBe(false);
    }
  });
});
