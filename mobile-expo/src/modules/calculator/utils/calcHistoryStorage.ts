import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalcHistoryEntry } from '../types';
import { auth } from '../../../services/firebase';
import { cloudSyncService } from '../../../services/cloudSync';

export const CALC_HISTORY_STORAGE_KEY = '@smartstudy_calc_history';
const MAX_HISTORY_ITEMS = 50;

function triggerBackgroundSync() {
  const user = auth.currentUser;
  if (user?.uid && !user.isAnonymous) {
    cloudSyncService.syncAll(user.uid).catch(() => {});
  }
}

export async function loadCalcHistory(): Promise<CalcHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CALC_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('[calcHistoryStorage] Error loading history:', error);
    return [];
  }
}

export async function saveCalcHistoryEntry(
  entry: Omit<CalcHistoryEntry, 'id' | 'timestamp'>
): Promise<CalcHistoryEntry[]> {
  try {
    const current = await loadCalcHistory();
    const newEntry: CalcHistoryEntry = {
      ...entry,
      id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    // Avoid duplicate immediate entries
    if (current.length > 0 && current[0].expression === newEntry.expression && current[0].result === newEntry.result) {
      return current;
    }

    const updated = [newEntry, ...current].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(CALC_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    triggerBackgroundSync();
    return updated;
  } catch (error) {
    console.error('[calcHistoryStorage] Error saving history entry:', error);
    return [];
  }
}

export async function clearCalcHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CALC_HISTORY_STORAGE_KEY);
    triggerBackgroundSync();
  } catch (error) {
    console.error('[calcHistoryStorage] Error clearing history:', error);
  }
}
