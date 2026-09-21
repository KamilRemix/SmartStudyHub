export interface ThemeColors {
  // Required Contract from PROJECT.md
  background: string;
  card: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;

  // Extended Design Tokens for Glassmorphism & High Fidelity
  surfaceSecondary: string;
  warning: string;
  glowPrimary: string;
  glowSecondary: string;
  shadowDeep: string;
  shadowLift: string;
  glassCard: string;
  glassBorder: string;

  // Web CSS Parity Aliases
  primaryAccent: string;
  secondaryAccent: string;
  componentBackground: string;
  textColor: string;
  textColorSecondary: string;
  borderColor: string;
}

export interface NoteColorItem {
  id: string;
  name: string;
  hex: string;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  isLoading: boolean;
}
