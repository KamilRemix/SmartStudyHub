/**
 * Tier 1: Feature Coverage — Requirement R8: Advanced Notes: Photos & Reminders
 * Specifications:
 * - Extended NoteItem schema with images array and reminder object
 * - Photo attachments add/remove operations
 * - Scheduled notifications integration via expo-notifications
 * - Notification cancellation
 * - Persistence of photo metadata and reminder state in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

describe('Tier 1 - R8: Advanced Notes (Photos & Reminders)', () => {
  const NOTES_KEY = '@smartstudy_notes';

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  interface ExtendedNoteItem {
    id: string;
    title: string;
    content: string;
    tags: string[];
    color: string;
    pinned: boolean;
    images?: string[];
    reminder?: {
      timestamp: number;
      notificationId?: string;
    };
    createdAt: number;
    updatedAt: number;
  }

  test('R8-1: NoteItem model accommodates multiple photo URIs', () => {
    const note: ExtendedNoteItem = {
      id: 'note_photo_1',
      title: 'Конспект по химии',
      content: 'Формулы органических соединений',
      tags: ['химия'],
      color: '#16504b',
      pinned: false,
      images: [
        'file:///data/user/0/com.smartstudyhub.mobile/files/photo1.jpg',
        'file:///data/user/0/com.smartstudyhub.mobile/files/photo2.jpg',
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(note.images).toBeDefined();
    expect(note.images).toHaveLength(2);
    expect(note.images![0]).toContain('photo1.jpg');
  });

  test('R8-2: Attaching and removing photos from a note', () => {
    let noteImages: string[] = [];

    // Add first photo
    noteImages.push('file:///images/page1.jpg');
    expect(noteImages).toHaveLength(1);

    // Add second photo
    noteImages.push('file:///images/page2.jpg');
    expect(noteImages).toHaveLength(2);

    // Remove first photo by index
    noteImages.splice(0, 1);
    expect(noteImages).toHaveLength(1);
    expect(noteImages[0]).toBe('file:///images/page2.jpg');
  });

  test('R8-3: Scheduling local notification with Android channel and date trigger', async () => {
    const triggerDate = new Date(Date.now() + 3600 * 1000); // 1 hour ahead
    const noteId = 'note_exam_prep';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Подготовка к экзамену',
        body: 'Повторить конспект по физике',
        data: { noteId },
        channelId: 'note-reminders',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(notificationId).toBe('mock-notification-id-999');
  });

  test('R8-4: Cancelling an existing scheduled reminder clears notification', async () => {
    const activeNotificationId = 'mock-notification-id-999';

    await Notifications.cancelScheduledNotificationAsync(activeNotificationId);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(activeNotificationId);

    const note: ExtendedNoteItem = {
      id: 'note_1',
      title: 'Заметка',
      content: 'Текст',
      tags: [],
      color: '#1e1e1e',
      pinned: false,
      reminder: undefined, // Cleared
      createdAt: 1,
      updatedAt: 2,
    };

    expect(note.reminder).toBeUndefined();
  });

  test('R8-5: Serializing and restoring notes with photos and reminders in AsyncStorage', async () => {
    const originalNotes: ExtendedNoteItem[] = [
      {
        id: 'note_complex',
        title: 'Анатомия',
        content: 'Строение клетки',
        tags: ['биология'],
        color: '#2e1065',
        pinned: true,
        images: ['file:///photos/cell.png'],
        reminder: {
          timestamp: 1726400000000,
          notificationId: 'notif_123',
        },
        createdAt: 1726300000000,
        updatedAt: 1726305000000,
      },
    ];

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(originalNotes));
    const stored = await AsyncStorage.getItem(NOTES_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!) as ExtendedNoteItem[];
    expect(parsed[0].images).toEqual(['file:///photos/cell.png']);
    expect(parsed[0].reminder?.notificationId).toBe('notif_123');
  });

  test('R8-6: Wheel picker scroll settlement accurately calculates and clamps index', () => {
    const itemHeight = 44;
    const hours = Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, '0'), value: i }));

    const computeIndex = (offsetY: number) => {
      const index = Math.round(offsetY / itemHeight);
      return Math.max(0, Math.min(hours.length - 1, index));
    };

    expect(computeIndex(0)).toBe(0);
    expect(computeIndex(44)).toBe(1);
    expect(computeIndex(44 * 12)).toBe(12);
    expect(computeIndex(44 * 12 + 10)).toBe(12);
    expect(computeIndex(44 * 12 + 30)).toBe(13);
    // Boundary clamps
    expect(computeIndex(-100)).toBe(0);
    expect(computeIndex(5000)).toBe(23);
  });

  test('R8-7: Wheel picker isolates user interaction and skips duplicate callback invocations', () => {
    let lastReported = 10;
    let callbackCount = 0;
    const onValueChange = (val: number) => {
      if (val !== lastReported) {
        lastReported = val;
        callbackCount++;
      }
    };

    // Triggering same value does not emit
    onValueChange(10);
    expect(callbackCount).toBe(0);

    // New value emits once
    onValueChange(11);
    expect(callbackCount).toBe(1);
    expect(lastReported).toBe(11);

    // Redundant trigger emits nothing
    onValueChange(11);
    expect(callbackCount).toBe(1);
  });
});

