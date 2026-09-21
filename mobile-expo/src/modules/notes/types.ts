export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  tags: string[];
  color: string;
  pinned: boolean;
  images?: string[];
  reminderTimestamp?: number;
  notificationId?: string;
  createdAt: number;
  updatedAt: number;
}

export type NoteViewMode = 'grid' | 'list';

export interface NotesFilterOptions {
  searchQuery: string;
  selectedTag: string;
}
