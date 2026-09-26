import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, database } from './firebase';
import { ref, get, set } from 'firebase/database';
import { networkService } from './network';

export interface SyncStatus {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  error: string | null;
}

const SYNC_KEYS = {
  CALC_HISTORY: '@smartstudy_calc_history',
  GRADES: '@smartstudy_grades_data',
  NOTES: '@smartstudy_notes_data',
  VAULT: '@ssh_password_vault',
  SETTINGS: '@ssh_user_settings',
  LAST_SYNC: '@ssh_last_sync_timestamp',
};

// Legacy keys for backward compatibility
const LEGACY_KEYS = {
  CALC_HISTORY: '@ssh_calc_history',
  GRADES: '@ssh_grades_data',
  NOTES: '@ssh_notes',
};

async function getStoredItemWithFallback(primaryKey: string, legacyKey?: string): Promise<string | null> {
  try {
    const item = await AsyncStorage.getItem(primaryKey);
    if (item) return item;
    if (legacyKey) {
      const legacyItem = await AsyncStorage.getItem(legacyKey);
      if (legacyItem) {
        await AsyncStorage.setItem(primaryKey, legacyItem);
        return legacyItem;
      }
    }
    return null;
  } catch {
    return null;
  }
}

class CloudSyncService {
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncedAt: number | null = null;
  private syncError: string | null = null;

  constructor() {
    this.loadLastSyncTime();
    // Auto-sync when reconnecting
    networkService.subscribe((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Trigger background sync if authenticated
        this.triggerAutoSync();
      }
    });
  }

  private async loadLastSyncTime() {
    try {
      const saved = await AsyncStorage.getItem(SYNC_KEYS.LAST_SYNC);
      if (saved) {
        this.lastSyncedAt = parseInt(saved, 10);
        this.notify();
      }
    } catch (e) {}
  }

  public subscribe(cb: (status: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    cb({
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
      error: this.syncError,
    });
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const status: SyncStatus = {
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
      error: this.syncError,
    };
    this.listeners.forEach((cb) => {
      try { cb(status); } catch (e) {}
    });
  }

  private isDefaultSeedGrades(data: any): boolean {
    if (!data || !Array.isArray(data.subjects) || data.subjects.length !== 3) return false;
    const seedIds = new Set(['subj_algebra', 'subj_russian', 'subj_physics']);
    return data.subjects.every((s: any) => seedIds.has(s.id));
  }

  private isDefaultSeedNotes(notes: any[]): boolean {
    if (!Array.isArray(notes) || notes.length === 0 || notes.length > 2) return false;
    const seedIds = new Set(['note_seed_1', 'note_seed_2']);
    return notes.every((n: any) => seedIds.has(n.id));
  }

  private async triggerAutoSync() {
    try {
      const user = auth.currentUser;
      if (user?.uid && !user?.isAnonymous) {
        await this.syncAll(user.uid);
      }
    } catch (e) {
      console.warn('[CloudSync] triggerAutoSync error:', e);
    }
  }

  /**
   * Sync all modules for an authenticated user:
   * Two-way merge: pulls remote data, merges with local, pushes combined data.
   */
  public async syncAll(uid: string): Promise<boolean> {
    if (!uid || this.isSyncing || !networkService.getIsOnline()) {
      return false;
    }

    this.isSyncing = true;
    this.syncError = null;
    this.notify();

    try {
      const userRootRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRootRef);
      const remoteData = snapshot.exists() ? snapshot.val() : {};

      // 1. Calc History (limit to 50 most recent items)
      await this.syncCalcHistory(uid, remoteData.calcHistory);

      // 2. Grades Data (two-way merge of subjects and grades)
      await this.syncGrades(uid, remoteData.grades);

      // 3. Notes Data (two-way merge by ID and updatedAt)
      await this.syncNotes(uid, remoteData.notes);

      // 4. Password Vault Data
      await this.syncPasswordVault(uid, remoteData.passwordVault);

      this.lastSyncedAt = Date.now();
      await AsyncStorage.setItem(SYNC_KEYS.LAST_SYNC, String(this.lastSyncedAt));
      this.isSyncing = false;
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('[CloudSync] Sync failed:', err);
      this.syncError = err?.message || 'Sync failed';
      this.isSyncing = false;
      this.notify();
      return false;
    }
  }

  private async syncCalcHistory(uid: string, remoteList: any[]) {
    try {
      const localStr = await getStoredItemWithFallback(SYNC_KEYS.CALC_HISTORY, LEGACY_KEYS.CALC_HISTORY);
      const localList: any[] = localStr ? JSON.parse(localStr) : [];

      // Combine by unique id or expression
      const combined = [...(localList || [])];
      if (Array.isArray(remoteList)) {
        for (const item of remoteList) {
          if (!combined.some((c) => c.id === item.id || (c.expression === item.expression && c.timestamp === item.timestamp))) {
            combined.push(item);
          }
        }
      }

      // Sort descending by timestamp and cap to 50 items
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const capped = combined.slice(0, 50);

      await AsyncStorage.setItem(SYNC_KEYS.CALC_HISTORY, JSON.stringify(capped));
      await set(ref(database, `users/${uid}/calcHistory`), capped);
    } catch (e) {
      console.warn('[CloudSync] syncCalcHistory error:', e);
    }
  }

  private async syncGrades(uid: string, remoteGrades: any) {
    try {
      const localStr = await getStoredItemWithFallback(SYNC_KEYS.GRADES, LEGACY_KEYS.GRADES);
      const localData = localStr ? JSON.parse(localStr) : null;

      // If local data is purely unedited initial demo seed and remote user has real data,
      // overwrite local with remote to prevent seed pollution in cloud!
      if (this.isDefaultSeedGrades(localData) && remoteGrades && Array.isArray(remoteGrades.subjects) && remoteGrades.subjects.length > 0) {
        await AsyncStorage.setItem(SYNC_KEYS.GRADES, JSON.stringify(remoteGrades));
        return;
      }

      if (!localData && remoteGrades) {
        await AsyncStorage.setItem(SYNC_KEYS.GRADES, JSON.stringify(remoteGrades));
      } else if (localData && !remoteGrades) {
        await set(ref(database, `users/${uid}/grades`), localData);
      } else if (localData && remoteGrades) {
        // Deep merge subjects: combine remote and local subjects and grades
        const subjectMap = new Map<string, any>();
        if (Array.isArray(remoteGrades.subjects)) {
          remoteGrades.subjects.forEach((s: any) => s?.id && subjectMap.set(s.id, s));
        }
        if (Array.isArray(localData.subjects)) {
          localData.subjects.forEach((s: any) => {
            if (s?.id) {
              const remoteSubj = subjectMap.get(s.id);
              if (!remoteSubj) {
                subjectMap.set(s.id, s);
              } else {
                const gradeMap = new Map<string, any>();
                (remoteSubj.grades || []).forEach((g: any) => g?.id && gradeMap.set(g.id, g));
                (s.grades || []).forEach((g: any) => g?.id && gradeMap.set(g.id, g));
                subjectMap.set(s.id, {
                  ...remoteSubj,
                  ...s,
                  grades: Array.from(gradeMap.values()),
                });
              }
            }
          });
        }

        const mergedGradesData = {
          settings: {
            ...(remoteGrades.settings || {}),
            ...(localData.settings || {}),
          },
          subjects: Array.from(subjectMap.values()),
        };

        await AsyncStorage.setItem(SYNC_KEYS.GRADES, JSON.stringify(mergedGradesData));
        await set(ref(database, `users/${uid}/grades`), mergedGradesData);
      }
    } catch (e) {
      console.warn('[CloudSync] syncGrades error:', e);
    }
  }

  private async syncNotes(uid: string, remoteNotes: any[]) {
    try {
      const localStr = await getStoredItemWithFallback(SYNC_KEYS.NOTES, LEGACY_KEYS.NOTES);
      const localNotes: any[] = localStr ? JSON.parse(localStr) : [];

      // If local data is purely unedited initial demo seed and remote user has real data,
      // overwrite local with remote to prevent seed pollution in cloud!
      if (this.isDefaultSeedNotes(localNotes) && Array.isArray(remoteNotes) && remoteNotes.length > 0) {
        await AsyncStorage.setItem(SYNC_KEYS.NOTES, JSON.stringify(remoteNotes));
        return;
      }

      const map = new Map<string, any>();
      if (Array.isArray(remoteNotes)) {
        remoteNotes.forEach((n) => n?.id && map.set(n.id, n));
      }
      localNotes.forEach((n) => {
        if (!n?.id) return;
        const existing = map.get(n.id);
        if (!existing || (n.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(n.id, n);
        }
      });

      const merged = Array.from(map.values());
      await AsyncStorage.setItem(SYNC_KEYS.NOTES, JSON.stringify(merged));
      await set(ref(database, `users/${uid}/notes`), merged);
    } catch (e) {
      console.warn('[CloudSync] syncNotes error:', e);
    }
  }

  private async syncPasswordVault(uid: string, remoteVault: any[]) {
    try {
      const localStr = await AsyncStorage.getItem(SYNC_KEYS.VAULT);
      const localVault: any[] = localStr ? JSON.parse(localStr) : [];

      const map = new Map<string, any>();
      if (Array.isArray(remoteVault)) {
        remoteVault.forEach((v) => v?.id && map.set(v.id, v));
      }
      localVault.forEach((v) => {
        if (!v?.id) return;
        const existing = map.get(v.id);
        if (!existing || (v.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(v.id, v);
        }
      });

      const merged = Array.from(map.values());
      await AsyncStorage.setItem(SYNC_KEYS.VAULT, JSON.stringify(merged));
      await set(ref(database, `users/${uid}/passwordVault`), merged);
    } catch (e) {
      console.warn('[CloudSync] syncPasswordVault error:', e);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
