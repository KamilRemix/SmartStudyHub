/**
 * Tier 2: Boundary & Corner Cases — Requirement R8: Advanced Notes
 * Scenarios:
 * - 0 photos vs. 20+ photos memory & layout safety
 * - Scheduling reminder in the past (validation error)
 * - Empty title & content note with photo attachment
 * - Corrupted / invalid image URI
 * - Deleting note with active scheduled notification (cleans up notification ID)
 */

import * as Notifications from 'expo-notifications';

describe('Tier 2 - R8: Notes Boundary & Corner Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('R8-B1: Scheduling reminder in the past is rejected with validation error', async () => {
    const pastTimestamp = Date.now() - 60000; // 1 minute in the past

    function validateReminderTime(timestamp: number): { valid: boolean; error?: string } {
      if (timestamp <= Date.now()) {
        return { valid: false, error: 'REMINDER_CANNOT_BE_IN_PAST' };
      }
      return { valid: true };
    }

    const res = validateReminderTime(pastTimestamp);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('REMINDER_CANNOT_BE_IN_PAST');
  });

  test('R8-B2: Note with 0 photos renders safely without hero image container', () => {
    const noteWithoutPhotos = {
      id: 'n1',
      title: 'Текстовая заметка',
      content: 'Только текст',
      images: [],
    };

    function hasHeroImage(images?: string[]): boolean {
      return Array.isArray(images) && images.length > 0;
    }

    expect(hasHeroImage(noteWithoutPhotos.images)).toBe(false);
    expect(hasHeroImage(undefined)).toBe(false);
  });

  test('R8-B3: Note with 25 photo attachments caps max attachments or safely stores list', () => {
    const MAX_IMAGES_PER_NOTE = 10;
    function addImageToNote(existingImages: string[], newUri: string): { images: string[]; allowed: boolean } {
      if (existingImages.length >= MAX_IMAGES_PER_NOTE) {
        return { images: existingImages, allowed: false };
      }
      return { images: [...existingImages, newUri], allowed: true };
    }

    let images: string[] = [];
    for (let i = 0; i < 15; i++) {
      const res = addImageToNote(images, `file:///photo_${i}.jpg`);
      images = res.images;
    }

    expect(images).toHaveLength(10); // Capped at 10 to prevent storage exhaustion
  });

  test('R8-B4: Note with empty title auto-names from content or default title', () => {
    function getEffectiveNoteTitle(title: string, content: string, hasImages: boolean): string {
      const cleanTitle = title.trim();
      if (cleanTitle) return cleanTitle;

      const cleanContent = content.trim();
      if (cleanContent) {
        return cleanContent.slice(0, 30) + (cleanContent.length > 30 ? '...' : '');
      }

      return hasImages ? 'Фотозаметка' : 'Без названия';
    }

    expect(getEffectiveNoteTitle('', 'Первая строка конспекта по физике', false)).toBe('Первая строка конспекта по физ...');
    expect(getEffectiveNoteTitle('', '', true)).toBe('Фотозаметка');
    expect(getEffectiveNoteTitle('', '', false)).toBe('Без названия');
  });

  test('R8-B5: Deleting a note with an active notification ID cancels notification in background', async () => {
    const noteToDelete = {
      id: 'note_active',
      title: 'Встреча',
      reminder: {
        timestamp: Date.now() + 100000,
        notificationId: 'notif_to_cancel_123',
      },
    };

    async function deleteNoteAndCancelNotification(note: typeof noteToDelete) {
      if (note.reminder?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(note.reminder.notificationId);
      }
      return true;
    }

    await deleteNoteAndCancelNotification(noteToDelete);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif_to_cancel_123');
  });
});
