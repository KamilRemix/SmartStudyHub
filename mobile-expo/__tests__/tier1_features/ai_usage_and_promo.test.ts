import { aiUsageService, LIMITS } from '../../src/services/aiUsageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AI Fair Use Usage & Limits', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await aiUsageService.initUser(null);
  });

  test('default free limits should be properly configured', () => {
    expect(LIMITS.free.text).toBe(15);
    expect(LIMITS.free.vision).toBe(3);
    expect(LIMITS.free.quiz).toBe(2);

    expect(LIMITS.pro.text).toBe(150);
    expect(LIMITS.pro.vision).toBe(30);
    expect(LIMITS.pro.quiz).toBe(20);
  });

  test('checkCanExecuteRequest allows requests within free limit', async () => {
    const check1 = await aiUsageService.checkCanExecuteRequest('text');
    expect(check1.allowed).toBe(true);
    expect(check1.remaining).toBe(15);
    expect(check1.max).toBe(15);
    expect(check1.isPro).toBe(false);

    // Record one successful request
    await aiUsageService.recordSuccessfulUsage('text');

    const check2 = await aiUsageService.checkCanExecuteRequest('text');
    expect(check2.allowed).toBe(true);
    expect(check2.remaining).toBe(14);
  });

  test('checkCanExecuteRequest blocks request when free limit is reached', async () => {
    // Simulate consuming all 15 free text requests
    for (let i = 0; i < 15; i++) {
      await aiUsageService.recordSuccessfulUsage('text');
    }

    const check = await aiUsageService.checkCanExecuteRequest('text');
    expect(check.allowed).toBe(false);
    expect(check.remaining).toBe(0);
    expect(check.reason).toBe('TEXT_LIMIT_REACHED');
  });

  test('PRO subscription grants 150 text requests and expands limits', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await aiUsageService.saveLocalSubscription({
      isPro: true,
      expiresAt: futureDate,
    });

    expect(aiUsageService.isProActive()).toBe(true);

    const check = await aiUsageService.checkCanExecuteRequest('text');
    expect(check.allowed).toBe(true);
    expect(check.max).toBe(150);
    expect(check.remaining).toBe(150);
    expect(check.isPro).toBe(true);
  });

  test('Expired PRO subscription reverts to Free limits', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    await aiUsageService.saveLocalSubscription({
      isPro: true,
      expiresAt: pastDate,
    });

    expect(aiUsageService.isProActive()).toBe(false);

    const check = await aiUsageService.checkCanExecuteRequest('text');
    expect(check.isPro).toBe(false);
    expect(check.max).toBe(15);
  });
});
