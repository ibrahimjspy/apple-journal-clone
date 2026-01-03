/**
 * Apple Journal Clone - Dark Theme
 * Based on Apple Journal's purple/violet aesthetic
 */

export const colors = {
  // Core backgrounds - Purple gradient base
  background: '#1A1625',
  backgroundGradientStart: '#2D2640',
  backgroundGradientEnd: '#1A1625',
  backgroundSecondary: '#252033',
  backgroundTertiary: '#302945',
  backgroundElevated: '#2A2440',
  
  // Surface colors (cards, modals)
  surface: '#2A2440',
  surfaceSecondary: '#342E4A',
  surfaceTertiary: '#3E3858',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A3B8',
  textTertiary: '#7D7892',
  textDisabled: '#5C5875',
  
  // Accent colors - Purple/Blue gradient
  accent: '#7C6AE8',
  accentSecondary: '#9D8DF7',
  accentLight: '#A78BFA',
  accentSoft: 'rgba(124, 106, 232, 0.2)',
  
  // FAB gradient colors
  fabGradientStart: '#8B7CF6',
  fabGradientEnd: '#6366F1',
  
  // System colors
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',
  
  // Borders & Dividers
  border: '#3D3655',
  borderLight: '#2E2845',
  divider: 'rgba(124, 106, 232, 0.15)',
  
  // Overlays
  overlay: 'rgba(26, 22, 37, 0.8)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',
  
  // Badge colors
  badge: 'rgba(0, 0, 0, 0.5)',
  
  // Google brand color
  googleBlue: '#4285F4',
  googleRed: '#EA4335',
  googleYellow: '#FBBC05',
  googleGreen: '#34A853',
  
  // Empty state icon gradient
  iconGradient1: '#F97316', // Orange
  iconGradient2: '#EC4899', // Pink
  iconGradient3: '#8B5CF6', // Purple
  iconGradient4: '#3B82F6', // Blue
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    xxxl: 34,
    display: 40,
  },
  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

// Card dimensions
export const cardLayout = {
  imageGridGap: 2,
  maxVisibleImages: 5,
  primaryImageRatio: 0.6, // 60% width for main image
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  cardLayout,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
