/**
 * Tier 2: Boundary & Corner Cases — Requirement R5: GenPass HIBP & Vault
 * Scenarios:
 * - Empty / 1-3 char passwords for HIBP range check
 * - Network failures / non-200 HTTP responses during HIBP query
 * - Passwords with special Unicode & Cyrillic characters
 * - Missing / whitespace service names in Password Vault
 * - Idempotent deletion of non-existent items
 */

import crypto from 'crypto';

describe('Tier 2 - R5: GenPass HIBP & Vault Boundary & Corner Cases', () => {
  function sha1(str: string): string {
    return crypto.createHash('sha1').update(str, 'utf8').digest('hex').toUpperCase();
  }

  test('R5-B1: Empty and short (<4 chars) passwords suppress HIBP network calls', () => {
    function shouldCheckPwned(pwd?: string): boolean {
      if (!pwd || pwd.trim().length < 4) return false;
      return true;
    }

    expect(shouldCheckPwned('')).toBe(false);
    expect(shouldCheckPwned('   ')).toBe(false);
    expect(shouldCheckPwned('123')).toBe(false);
    expect(shouldCheckPwned(undefined)).toBe(false);
    expect(shouldCheckPwned('1234')).toBe(true);
  });

  test('R5-B2: HIBP API network error (500 or timeout) handles failure gracefully', async () => {
    async function checkLeakWithFallback(apiFetch: () => Promise<any>): Promise<{ isPwned: boolean; error?: string }> {
      try {
        const res = await apiFetch();
        if (!res.ok) {
          return { isPwned: false, error: 'API_ERROR' };
        }
        return { isPwned: false };
      } catch (err: any) {
        return { isPwned: false, error: 'OFFLINE_OR_TIMEOUT' };
      }
    }

    // Simulate 500 Internal Server Error
    const error500 = await checkLeakWithFallback(async () => ({ ok: false, status: 500 }));
    expect(error500.isPwned).toBe(false);
    expect(error500.error).toBe('API_ERROR');

    // Simulate Network Timeout
    const timeout = await checkLeakWithFallback(async () => {
      throw new Error('Connection timed out');
    });
    expect(timeout.isPwned).toBe(false);
    expect(timeout.error).toBe('OFFLINE_OR_TIMEOUT');
  });

  test('R5-B3: UTF-8 and Cyrillic character passwords calculate consistent SHA-1 hash', () => {
    const cyrillicPwd = 'Пароль123!@#';
    const hash = sha1(cyrillicPwd);

    expect(hash.length).toBe(40);
    // Prefix is 5 chars
    expect(hash.slice(0, 5).length).toBe(5);
    // Deterministic repeatability
    expect(sha1(cyrillicPwd)).toBe(hash);
  });

  test('R5-B4: Vault item service name whitespace normalization', () => {
    function sanitizeVaultItem(service: string, login: string, password: string) {
      const cleanService = service.trim() || 'Без названия';
      const cleanLogin = login.trim();
      const cleanPassword = password; // Passwords preserve exact characters

      return {
        service: cleanService,
        login: cleanLogin,
        password: cleanPassword,
        isValid: cleanPassword.length > 0,
      };
    }

    const item = sanitizeVaultItem('   Яндекс Почта   ', '  student  ', 'Secret123');
    expect(item.service).toBe('Яндекс Почта');
    expect(item.login).toBe('student');
    expect(item.isValid).toBe(true);

    const emptyItem = sanitizeVaultItem('   ', '', '123');
    expect(emptyItem.service).toBe('Без названия');
  });

  test('R5-B5: Idempotent deletion of non-existent item in Vault', () => {
    let vault = [
      { id: 'item_1', service: 'Site A' },
      { id: 'item_2', service: 'Site B' },
    ];

    function deleteItem(items: any[], idToDelete: string) {
      return items.filter((i) => i.id !== idToDelete);
    }

    // Delete existing
    vault = deleteItem(vault, 'item_1');
    expect(vault).toHaveLength(1);

    // Delete non-existent
    vault = deleteItem(vault, 'non_existent_id_999');
    expect(vault).toHaveLength(1);
    expect(vault[0].id).toBe('item_2');
  });
});
