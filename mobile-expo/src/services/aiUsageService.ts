import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { firestore } from './firebase';

export type AIRequestType = 'text' | 'vision' | 'quiz';

export interface DailyUsage {
  lastResetDate: string; // YYYY-MM-DD
  lastServerSyncTime?: number;
  textRequestsToday: number;
  visionRequestsToday: number;
  quizGenerationsToday: number;
}

export interface UserSubscription {
  isPro: boolean;
  expiresAt: string; // ISO 8601
  activatedAt?: string;
  activatedCode?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  max: number;
  isPro: boolean;
  reason?: 'TEXT_LIMIT_REACHED' | 'VISION_LIMIT_REACHED' | 'QUIZ_LIMIT_REACHED';
}

// Fair Use limits
export const LIMITS = {
  free: {
    text: 15,
    vision: 3,
    quiz: 2,
  },
  pro: {
    text: 150,
    vision: 30,
    quiz: 20,
  },
};

const STORAGE_KEYS = {
  USAGE: 'smartstudy_ai_usage_v1',
  SUBSCRIPTION: 'smartstudy_user_sub_v1',
};

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class AIUsageService {
  private static instance: AIUsageService;
  private currentUsage: DailyUsage | null = null;
  private currentSubscription: UserSubscription | null = null;
  private currentUid: string | null = null;

  private constructor() {}

  public static getInstance(): AIUsageService {
    if (!AIUsageService.instance) {
      AIUsageService.instance = new AIUsageService();
    }
    return AIUsageService.instance;
  }

  /**
   * Initializes or refreshes state for a user
   */
  public async initUser(uid: string | null): Promise<void> {
    this.currentUid = uid;
    await this.loadLocalCache();

    if (uid) {
      // Sync in background without blocking UI
      this.syncWithServer(uid).catch((err) => {
        console.warn('[AIUsageService] Background server sync error:', err);
      });
    }
  }

  private async loadLocalCache(): Promise<void> {
    try {
      const [rawUsage, rawSub] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USAGE),
        AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION),
      ]);

      const today = getTodayString();

      if (rawUsage) {
        const parsed: DailyUsage = JSON.parse(rawUsage);
        // Daily reset check
        if (parsed.lastResetDate !== today) {
          this.currentUsage = {
            lastResetDate: today,
            lastServerSyncTime: Date.now(),
            textRequestsToday: 0,
            visionRequestsToday: 0,
            quizGenerationsToday: 0,
          };
          await this.saveLocalUsage(this.currentUsage);
        } else {
          this.currentUsage = parsed;
        }
      } else {
        this.currentUsage = {
          lastResetDate: today,
          lastServerSyncTime: Date.now(),
          textRequestsToday: 0,
          visionRequestsToday: 0,
          quizGenerationsToday: 0,
        };
        await this.saveLocalUsage(this.currentUsage);
      }

      if (rawSub) {
        this.currentSubscription = JSON.parse(rawSub);
      } else {
        this.currentSubscription = { isPro: false, expiresAt: '' };
      }
    } catch (e) {
      console.warn('[AIUsageService] Error loading local cache:', e);
    }
  }

  private async saveLocalUsage(usage: DailyUsage): Promise<void> {
    this.currentUsage = usage;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
    } catch (e) {
      console.warn('[AIUsageService] Error saving usage locally:', e);
    }
  }

  public async saveLocalSubscription(sub: UserSubscription): Promise<void> {
    this.currentSubscription = sub;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
    } catch (e) {
      console.warn('[AIUsageService] Error saving subscription locally:', e);
    }
  }

  /**
   * Checks whether the current subscription is genuinely active
   */
  public isProActive(): boolean {
    if (!this.currentSubscription?.isPro) return false;
    if (!this.currentSubscription.expiresAt) return false;
    const expiresTime = new Date(this.currentSubscription.expiresAt).getTime();
    return !isNaN(expiresTime) && expiresTime > Date.now();
  }

  /**
   * Fast synchronous or cached check before sending any AI request
   */
  public async checkCanExecuteRequest(type: AIRequestType): Promise<LimitCheckResult> {
    if (!this.currentUsage) {
      await this.loadLocalCache();
    }

    const today = getTodayString();
    if (this.currentUsage && this.currentUsage.lastResetDate !== today) {
      this.currentUsage = {
        lastResetDate: today,
        lastServerSyncTime: Date.now(),
        textRequestsToday: 0,
        visionRequestsToday: 0,
        quizGenerationsToday: 0,
      };
      await this.saveLocalUsage(this.currentUsage);
    }

    const isPro = this.isProActive();
    const limits = isPro ? LIMITS.pro : LIMITS.free;
    const usage = this.currentUsage || {
      lastResetDate: today,
      textRequestsToday: 0,
      visionRequestsToday: 0,
      quizGenerationsToday: 0,
    };

    let current = 0;
    let max = 0;
    let reason: LimitCheckResult['reason'] = undefined;

    if (type === 'text') {
      current = usage.textRequestsToday;
      max = limits.text;
      reason = 'TEXT_LIMIT_REACHED';
    } else if (type === 'vision') {
      current = usage.visionRequestsToday;
      max = limits.vision;
      reason = 'VISION_LIMIT_REACHED';
    } else if (type === 'quiz') {
      current = usage.quizGenerationsToday;
      max = limits.quiz;
      reason = 'QUIZ_LIMIT_REACHED';
    }

    const remaining = Math.max(0, max - current);
    const allowed = remaining > 0;

    return {
      allowed,
      remaining,
      max,
      isPro,
      reason: allowed ? undefined : reason,
    };
  }

  /**
   * Called strictly AFTER a model generation succeeds.
   * Atomically updates local cache and pushes increment to Firestore.
   */
  public async recordSuccessfulUsage(type: AIRequestType): Promise<void> {
    if (!this.currentUsage) {
      await this.loadLocalCache();
    }

    const usage = this.currentUsage || {
      lastResetDate: getTodayString(),
      textRequestsToday: 0,
      visionRequestsToday: 0,
      quizGenerationsToday: 0,
    };

    if (type === 'text') {
      usage.textRequestsToday += 1;
    } else if (type === 'vision') {
      usage.visionRequestsToday += 1;
    } else if (type === 'quiz') {
      usage.quizGenerationsToday += 1;
    }

    await this.saveLocalUsage(usage);

    // Sync to Firestore asynchronously
    if (this.currentUid) {
      const uid = this.currentUid;
      const fieldMap = {
        text: 'usage.textRequestsToday',
        vision: 'usage.visionRequestsToday',
        quiz: 'usage.quizGenerationsToday',
      };
      const field = fieldMap[type];

      const userRef = doc(firestore, 'users', uid);
      updateDoc(userRef, {
        [field]: increment(1),
        'usage.lastResetDate': usage.lastResetDate,
        'usage.lastLocalUpdate': Date.now(),
      }).catch((err) => {
        // If doc doesn't exist yet, create it gracefully
        setDoc(
          userRef,
          {
            usage: {
              ...usage,
              lastLocalUpdate: Date.now(),
            },
          },
          { merge: true }
        ).catch((setErr) => {
          console.warn('[AIUsageService] Firestore sync update error:', setErr);
        });
      });
    }
  }

  /**
   * Syncs usage and subscription status from Firestore
   */
  public async syncWithServer(uid: string): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const serverSub = data.subscription as UserSubscription | undefined;
        if (serverSub) {
          await this.saveLocalSubscription(serverSub);
        }

        const serverUsage = data.usage as DailyUsage | undefined;
        const today = getTodayString();
        if (serverUsage && serverUsage.lastResetDate === today) {
          // Merge whichever has the higher count to prevent bypasses
          const current = this.currentUsage || {
            lastResetDate: today,
            textRequestsToday: 0,
            visionRequestsToday: 0,
            quizGenerationsToday: 0,
          };

          const merged: DailyUsage = {
            lastResetDate: today,
            lastServerSyncTime: Date.now(),
            textRequestsToday: Math.max(current.textRequestsToday, serverUsage.textRequestsToday || 0),
            visionRequestsToday: Math.max(current.visionRequestsToday, serverUsage.visionRequestsToday || 0),
            quizGenerationsToday: Math.max(current.quizGenerationsToday, serverUsage.quizGenerationsToday || 0),
          };
          await this.saveLocalUsage(merged);
        }
      }
    } catch (e) {
      console.warn('[AIUsageService] Sync with server failed:', e);
    }
  }

  /**
   * Helper to fetch remaining counts for all categories
   */
  public async getRemainingSummary(): Promise<{
    text: { remaining: number; max: number };
    vision: { remaining: number; max: number };
    quiz: { remaining: number; max: number };
    isPro: boolean;
    expiresAt?: string;
  }> {
    const isPro = this.isProActive();
    const limits = isPro ? LIMITS.pro : LIMITS.free;
    const usage = this.currentUsage || {
      lastResetDate: getTodayString(),
      textRequestsToday: 0,
      visionRequestsToday: 0,
      quizGenerationsToday: 0,
    };

    return {
      text: {
        remaining: Math.max(0, limits.text - usage.textRequestsToday),
        max: limits.text,
      },
      vision: {
        remaining: Math.max(0, limits.vision - usage.visionRequestsToday),
        max: limits.vision,
      },
      quiz: {
        remaining: Math.max(0, limits.quiz - usage.quizGenerationsToday),
        max: limits.quiz,
      },
      isPro,
      expiresAt: this.currentSubscription?.expiresAt,
    };
  }
}

export const aiUsageService = AIUsageService.getInstance();
