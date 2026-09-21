import { ThemeColors, NoteColorItem } from './types';

export const lightColors: ThemeColors = {
  background: '#f4f7f9',
  card: '#ffffff',
  surface: '#ffffff',
  surfaceSecondary: '#f0f2f5',
  primary: '#007aff',
  secondary: '#ff3b30',
  text: '#000000',
  textSecondary: '#6e6e73',
  border: 'rgba(0, 0, 0, 0.10)',
  error: '#ff3b30',
  success: '#34c759',
  warning: '#ff9500',
  glowPrimary: 'rgba(0, 122, 255, 0.30)',
  glowSecondary: 'rgba(255, 59, 48, 0.30)',
  shadowDeep: 'rgba(0, 0, 0, 0.15)',
  shadowLift: 'rgba(0, 0, 0, 0.05)',
  glassCard: 'rgba(255, 255, 255, 0.80)',
  glassBorder: 'rgba(0, 122, 255, 0.15)',

  // Web CSS parity aliases
  primaryAccent: '#007aff',
  secondaryAccent: '#ff3b30',
  componentBackground: '#ffffff',
  textColor: '#000000',
  textColorSecondary: '#6e6e73',
  borderColor: 'rgba(0, 0, 0, 0.10)',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1e1e1e',
  surface: '#1e1e1e',
  surfaceSecondary: '#262626',
  primary: '#00ffff',
  secondary: '#9400d3',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  border: 'rgba(255, 255, 255, 0.12)',
  error: '#ff4c4c',
  success: '#00e676',
  warning: '#ffeb3b',
  glowPrimary: 'rgba(0, 255, 255, 0.40)',
  glowSecondary: 'rgba(148, 0, 211, 0.40)',
  shadowDeep: 'rgba(0, 0, 0, 0.50)',
  shadowLift: 'rgba(0, 0, 0, 0.30)',
  glassCard: 'rgba(26, 26, 38, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',

  // Web CSS parity aliases
  primaryAccent: '#00ffff',
  secondaryAccent: '#9400d3',
  componentBackground: '#1e1e1e',
  textColor: '#e0e0e0',
  textColorSecondary: '#a0a0a0',
  borderColor: 'rgba(255, 255, 255, 0.12)',
};

export const NOTE_COLOR_PALETTE: NoteColorItem[] = [
  { id: 'default', name: 'Default', hex: '' },
  { id: 'red', name: 'Red', hex: '#5c2b29' },
  { id: 'orange', name: 'Orange', hex: '#614a19' },
  { id: 'yellow', name: 'Yellow', hex: '#635d19' },
  { id: 'green', name: 'Green', hex: '#345920' },
  { id: 'teal', name: 'Teal', hex: '#16504b' },
  { id: 'blue', name: 'Blue', hex: '#2d555e' },
  { id: 'dark_blue', name: 'Dark Blue', hex: '#1e3a8a' },
  { id: 'purple', name: 'Purple', hex: '#42275e' },
  { id: 'pink', name: 'Pink', hex: '#5b2245' },
];
