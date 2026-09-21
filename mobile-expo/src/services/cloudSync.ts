import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './firebase';
import { ref, get, set } from 'firebase/database';
import { networkService } from './network';

export interface SyncStatus {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  error: string | null;
}

const SYNC_KEYS = {
  CALC_HISTORY: '@ssh_calc_history',
  GRADES: '@ssh_grades_data',
  NOTES: '@ssh_notes',
  VAULT: '@ssh_password_vault',
  SETTINGS: '@ssh_user_settings',
  LAST_SYNC: '@ssh_last_sync_timestamp',
};

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

  private async triggerAutoSync() {
    try {
      const userStr = await AsyncStorage.getItem('@ssh_auth_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.uid && !user?.isAnonymous) {
          await this.syncAll(user.uid);
        }
      }
    } catch (e) {}
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

      // 1. Calc History (limit to 10 most recent items to avoid memory bloat)
      await this.syncCalcHistory(uid, remoteData.calcHistory);

      // 2. Grades Data
      await this.syncGrades(uid, remoteData.grades);

      // 3. Notes Data
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
      const localStr = await AsyncStorage.getItem(SYNC_KEYS.CALC_HISTORY);
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

      // Sort descending by timestamp and cap to 10 items
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const capped = combined.slice(0, 10);

      await AsyncStorage.setItem(SYNC_KEYS.CALC_HISTORY, JSON.stringify(capped));
      await set(ref(database, `users/${uid}/calcHistory`), capped);
    } catch (e) {
      console.warn('[CloudSync] syncCalcHistory error:', e);
    }
  }

  private async syncGrades(uid: string, remoteGrades: any) {
    try {
      const localStr = await AsyncStorage.getItem(SYNC_KEYS.GRADES);
      const localData = localStr ? JSON.parse(localStr) : null;

      if (!localData && remoteGrades) {
        await AsyncStorage.setItem(SYNC_KEYS.GRADES, JSON.stringify(remoteGrades));
      } else if (localData) {
        // Push local grades up
        await set(ref(database, `users/${uid}/grades`), localData);
      }
    } catch (e) {
      console.warn('[CloudSync] syncGrades error:', e);
    }
  }

  private async syncNotes(uid: string, remoteNotes: any[]) {
    try {
      const localStr = await AsyncStorage.getItem(SYNC_KEYS.NOTES);
      const localNotes: any[] = localStr ? JSON.parse(localStr) : [];

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
