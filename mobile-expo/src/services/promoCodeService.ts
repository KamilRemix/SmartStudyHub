import { doc, runTransaction } from 'firebase/firestore';
import { firestore } from './firebase';
import { aiUsageService } from './aiUsageService';

export interface PromoActivationResult {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export async function redeemPromoCode(
  rawCode: string,
  uid: string
): Promise<PromoActivationResult> {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      success: false,
      message: 'Пожалуйста, введите код активации.',
    };
  }

  if (!uid) {
    return {
      success: false,
      message: 'Для активации кода необходимо войти в аккаунт.',
    };
  }

  try {
    const codeRef = doc(firestore, 'activation_codes', cleanCode);
    const userRef = doc(firestore, 'users', uid);

    const result = await runTransaction(firestore, async (transaction) => {
      const codeSnap = await transaction.get(codeRef);

      if (!codeSnap.exists()) {
        throw new Error('NOT_FOUND');
      }

      const codeData = codeSnap.data();

      if (codeData.isUsed) {
        throw new Error('ALREADY_USED');
      }

      const durationDays = codeData.durationDays || 30;
      const now = new Date();
      const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const expiresAt = expiresDate.toISOString();

      // 1. Mark activation code as used
      transaction.update(codeRef, {
        isUsed: true,
        usedByUid: uid,
        usedAt: now.toISOString(),
      });

      // 2. Update user profile subscription
      transaction.set(
        userRef,
        {
          subscription: {
            isPro: true,
            expiresAt,
            activatedAt: now.toISOString(),
            activatedCode: cleanCode,
          },
        },
        { merge: true }
      );

      return { expiresAt };
    });

    // Update local cache immediately
    await aiUsageService.saveLocalSubscription({
      isPro: true,
      expiresAt: result.expiresAt,
      activatedAt: new Date().toISOString(),
      activatedCode: cleanCode,
    });

    return {
      success: true,
      message: 'SmartStudy PRO успешно активирован на 30 дней!',
      expiresAt: result.expiresAt,
    };
  } catch (err: any) {
    if (err?.message === 'NOT_FOUND') {
      return {
        success: false,
        message: 'Код активации не найден. Проверьте правильность ввода.',
      };
    }
    if (err?.message === 'ALREADY_USED') {
      return {
        success: false,
        message: 'Этот код активации уже был использован ранее.',
      };
    }
    console.error('[promoCodeService] Activation transaction error:', err);
    return {
      success: false,
      message: 'Не удалось активировать код. Проверьте подключение к сети.',
    };
  }
}
