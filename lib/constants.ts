/**
 * Design System Constants
 * Centralized values for consistent sizing, spacing, and styling across the app
 */

// ============================================
// BUTTON SIZES
// ============================================

export const BUTTON_SIZES = {
  /** Extra small buttons (icon-only, 20px) */
  xs: "h-5 w-5",

  /** Small buttons (32px height) */
  sm: "h-8",

  /** Medium buttons (36px height) - default */
  md: "h-9",

  /** Large buttons (40px height) */
  lg: "h-10",

  /** Extra large buttons (44px height) */
  xl: "h-11",
} as const;

// ============================================
// SPACING SCALE
// ============================================

export const SPACING = {
  /** 4px */
  xs: "1",

  /** 8px */
  sm: "2",

  /** 12px */
  md: "3",

  /** 16px */
  lg: "4",

  /** 20px */
  xl: "5",

  /** 24px */
  "2xl": "6",

  /** 32px */
  "3xl": "8",

  /** 40px */
  "4xl": "10",
} as const;

// ============================================
// RESPONSIVE PADDING
// ============================================

export const RESPONSIVE_PADDING = {
  /** Mobile: 12px, Tablet: 16px, Desktop: 24px, Large: 32px */
  container: "p-3 sm:p-4 md:p-6 lg:p-8",

  /** Mobile: 12px, Tablet: 16px, Desktop: 24px */
  card: "p-3 sm:p-4 md:p-6",

  /** Mobile: 8px, Tablet: 12px, Desktop: 16px */
  section: "p-2 sm:p-3 md:p-4",
} as const;

// ============================================
// GAP / MARGINS
// ============================================

export const GAPS = {
  /** Mobile: 12px, Tablet: 16px */
  tight: "gap-3 sm:gap-4",

  /** Mobile: 16px, Tablet: 24px */
  normal: "gap-4 sm:gap-6",

  /** Mobile: 24px, Tablet: 32px */
  relaxed: "gap-6 sm:gap-8",
} as const;

export const SPACE_Y = {
  /** Vertical space between items - tight (12px, 16px) */
  tight: "space-y-3 sm:space-y-4",

  /** Vertical space between items - normal (16px, 24px) */
  normal: "space-y-4 sm:space-y-6",

  /** Vertical space between items - relaxed (24px, 32px) */
  relaxed: "space-y-6 sm:space-y-8",
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const FONT_SIZES = {
  /** 10px - Very small labels/badges */
  "2xs": "text-[10px]",

  /** 12px - Small text */
  xs: "text-xs",

  /** 14px - Body text */
  sm: "text-sm",

  /** 16px - Default body */
  base: "text-base",

  /** 18px - Small headings */
  lg: "text-lg",

  /** 20px - Medium headings */
  xl: "text-xl",

  /** 24px - Large headings */
  "2xl": "text-2xl",

  /** 30px - Extra large headings */
  "3xl": "text-3xl",
} as const;

export const FONT_WEIGHTS = {
  /** 300 - Light */
  light: "font-light",

  /** 400 - Normal */
  normal: "font-normal",

  /** 500 - Medium */
  medium: "font-medium",

  /** 600 - Semibold */
  semibold: "font-semibold",

  /** 700 - Bold */
  bold: "font-bold",

  /** 800 - Extrabold */
  extrabold: "font-extrabold",
} as const;

// ============================================
// RESPONSIVE GRID LAYOUTS
// ============================================

export const GRIDS = {
  /** Single column on mobile, 2 columns on tablet+ */
  twoCol: "grid grid-cols-1 sm:grid-cols-2",

  /** Single column on mobile, 2 on tablet, 3 on desktop */
  threeCol: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",

  /** Single column on mobile, 2 on tablet, 4 on desktop */
  fourCol: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

// ============================================
// ICON SIZES
// ============================================

export const ICON_SIZES = {
  /** 12px × 12px */
  xs: "h-3 w-3",

  /** 14px × 14px */
  sm: "h-3.5 w-3.5",

  /** 16px × 16px */
  md: "h-4 w-4",

  /** 20px × 20px */
  lg: "h-5 w-5",

  /** 24px × 24px */
  xl: "h-6 w-6",

  /** 32px × 32px */
  "2xl": "h-8 w-8",

  /** 40px × 40px */
  "3xl": "h-10 w-10",
} as const;

export const RESPONSIVE_ICON_SIZES = {
  /** Mobile: 14px, Desktop: 16px */
  sm: "h-3.5 w-3.5 sm:h-4 sm:w-4",

  /** Mobile: 16px, Desktop: 20px */
  md: "h-4 w-4 sm:h-5 sm:w-5",

  /** Mobile: 20px, Desktop: 24px */
  lg: "h-5 w-5 sm:h-6 sm:w-6",
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const BORDER_RADIUS = {
  /** 2px */
  sm: "rounded-sm",

  /** 4px */
  md: "rounded",

  /** 6px */
  lg: "rounded-md",

  /** 8px */
  xl: "rounded-lg",

  /** Full circle */
  full: "rounded-full",
} as const;

// ============================================
// SHADOWS
// ============================================

export const SHADOWS = {
  /** Light shadow */
  sm: "shadow-sm",

  /** Medium shadow */
  md: "shadow",

  /** Large shadow */
  lg: "shadow-lg",

  /** Extra large shadow */
  xl: "shadow-xl",

  /** No shadow */
  none: "shadow-none",
} as const;

// ============================================
// TRANSITIONS & ANIMATIONS
// ============================================

export const TRANSITIONS = {
  /** Fast transitions (150ms) */
  fast: "transition-all duration-150",

  /** Normal transitions (200ms) */
  normal: "transition-all duration-200",

  /** Slow transitions (300ms) */
  slow: "transition-all duration-300",
} as const;

// ============================================
// Z-INDEX LAYERS
// ============================================

export const Z_INDEX = {
  /** Default layer (0) */
  base: "z-0",

  /** Dropdown/popover (10) */
  dropdown: "z-10",

  /** Sticky elements (20) */
  sticky: "z-20",

  /** Mobile header (40) */
  header: "z-40",

  /** Sidebar drawer (50) */
  sidebar: "z-50",

  /** Modal/dialog (fixed: 50) */
  modal: "z-50",

  /** Toast notifications (50) */
  toast: "z-50",
} as const;

// ============================================
// COLORS
// ============================================

export const COLORS = {
  primary: "#168BB0",
  primaryHover: "#0F7493",
  primaryLight: "#45B0D2",
  primarySoft: "#EAF7FB",

  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const BREAKPOINTS = {
  /** Mobile (< 640px) */
  mobile: "0",

  /** Tablet (>= 640px) */
  tablet: "640px",

  /** Desktop (>= 1024px) */
  desktop: "1024px",

  /** Large Desktop (>= 1280px) */
  large: "1280px",
} as const;

// ============================================
// ANIMATION DELAYS
// ============================================

export const DELAYS = {
  /** Toast notification duration (3 seconds) */
  toast: 3000,

  /** Confirmation dialog open (200ms) */
  dialogOpen: 200,

  /** Dropdown open (100ms) */
  dropdownOpen: 100,
} as const;
