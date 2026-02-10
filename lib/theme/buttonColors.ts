/**
 * Site-wide button/CTA color mapping.
 * Keys must match Sanity homepage.primaryButtonColor options.
 * Used by ThemeContext so changing the color in Sanity updates themed buttons (cart, floating promo, etc.).
 */

export type ButtonColorName =
  | "red"
  | "amber"
  | "cyan"
  | "teal"
  | "sky"
  | "pink"
  | "purple"
  | "yellow"
  | "emerald"
  | "blue";

export interface ButtonThemeClasses {
  /** Hero / prominent CTA: bg-*-600 hover:bg-*-500 text-white */
  primary: string;
  /** Footer, cart, checkout: bg-*-800 hover:bg-*-700 text-*-200 */
  secondary: string;
  /** Secondary with border (checkout, cart) */
  secondaryBorder: string;
  /** Secondary button with text-*-100 instead of *-200 */
  secondaryTextLight: string;
  /** Small badge: bg-*-600 text-white */
  badge: string;
  /** Muted badge: bg-*-900 text-*-200 */
  badgeMuted: string;
  /** Focus ring */
  ring: string;
  /** Gradient background (card overlays): from-*-900/20 to-*-800/20 */
  gradient: string;
  /** Gradient icon text: text-*-300/60 hover */
  gradientText: string;
  /** Tag/chip: bg-*-500/20 text-*-300 */
  tag: string;
  /** Cart count badge: bg-*-600 text-*-100 border-*-500 */
  cartBadge: string;
}

const colorMap: Record<ButtonColorName, ButtonThemeClasses> = {
  teal: {
    primary: "bg-teal-600 hover:bg-teal-500 text-white",
    secondary: "bg-teal-800 hover:bg-teal-700 text-teal-200",
    secondaryBorder:
      "bg-teal-800 hover:bg-teal-700 text-teal-200 border-teal-700",
    secondaryTextLight: "bg-teal-800 hover:bg-teal-700 text-teal-100",
    badge: "bg-teal-600 text-white",
    badgeMuted: "bg-teal-900 text-teal-200",
    ring: "focus:ring-teal-500",
    gradient: "from-teal-900/20 to-teal-800/20",
    gradientText: "text-teal-300/60 group-hover:text-teal-300/80",
    tag: "bg-teal-500/20 text-teal-300",
    cartBadge: "bg-teal-600 text-teal-100 border-teal-500",
  },
  red: {
    primary: "bg-red-600 hover:bg-red-500 text-white",
    secondary: "bg-red-800 hover:bg-red-700 text-red-200",
    secondaryBorder: "bg-red-800 hover:bg-red-700 text-red-200 border-red-700",
    secondaryTextLight: "bg-red-800 hover:bg-red-700 text-red-100",
    badge: "bg-red-600 text-white",
    badgeMuted: "bg-red-900 text-red-200",
    ring: "focus:ring-red-500",
    gradient: "from-red-900/20 to-red-800/20",
    gradientText: "text-red-300/60 group-hover:text-red-300/80",
    tag: "bg-red-500/20 text-red-300",
    cartBadge: "bg-red-600 text-red-100 border-red-500",
  },
  amber: {
    primary: "bg-amber-600 hover:bg-amber-500 text-white",
    secondary: "bg-amber-800 hover:bg-amber-700 text-amber-200",
    secondaryBorder:
      "bg-amber-800 hover:bg-amber-700 text-amber-200 border-amber-700",
    secondaryTextLight: "bg-amber-800 hover:bg-amber-700 text-amber-100",
    badge: "bg-amber-600 text-white",
    badgeMuted: "bg-amber-900 text-amber-200",
    ring: "focus:ring-amber-500",
    gradient: "from-amber-900/20 to-amber-800/20",
    gradientText: "text-amber-300/60 group-hover:text-amber-300/80",
    tag: "bg-amber-500/20 text-amber-300",
    cartBadge: "bg-amber-600 text-amber-100 border-amber-500",
  },
  cyan: {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    secondary: "bg-cyan-800 hover:bg-cyan-700 text-cyan-200",
    secondaryBorder:
      "bg-cyan-800 hover:bg-cyan-700 text-cyan-200 border-cyan-700",
    secondaryTextLight: "bg-cyan-800 hover:bg-cyan-700 text-cyan-100",
    badge: "bg-cyan-600 text-white",
    badgeMuted: "bg-cyan-900 text-cyan-200",
    ring: "focus:ring-cyan-500",
    gradient: "from-cyan-900/20 to-cyan-800/20",
    gradientText: "text-cyan-300/60 group-hover:text-cyan-300/80",
    tag: "bg-cyan-500/20 text-cyan-300",
    cartBadge: "bg-cyan-600 text-cyan-100 border-cyan-500",
  },
  sky: {
    primary: "bg-sky-600 hover:bg-sky-500 text-white",
    secondary: "bg-sky-800 hover:bg-sky-700 text-sky-200",
    secondaryBorder: "bg-sky-800 hover:bg-sky-700 text-sky-200 border-sky-700",
    secondaryTextLight: "bg-sky-800 hover:bg-sky-700 text-sky-100",
    badge: "bg-sky-600 text-white",
    badgeMuted: "bg-sky-900 text-sky-200",
    ring: "focus:ring-sky-500",
    gradient: "from-sky-900/20 to-sky-800/20",
    gradientText: "text-sky-300/60 group-hover:text-sky-300/80",
    tag: "bg-sky-500/20 text-sky-300",
    cartBadge: "bg-sky-600 text-sky-100 border-sky-500",
  },
  pink: {
    primary: "bg-pink-600 hover:bg-pink-500 text-white",
    secondary: "bg-pink-800 hover:bg-pink-700 text-pink-200",
    secondaryBorder:
      "bg-pink-800 hover:bg-pink-700 text-pink-200 border-pink-700",
    secondaryTextLight: "bg-pink-800 hover:bg-pink-700 text-pink-100",
    badge: "bg-pink-600 text-white",
    badgeMuted: "bg-pink-900 text-pink-200",
    ring: "focus:ring-pink-500",
    gradient: "from-pink-900/20 to-pink-800/20",
    gradientText: "text-pink-300/60 group-hover:text-pink-300/80",
    tag: "bg-pink-500/20 text-pink-300",
    cartBadge: "bg-pink-600 text-pink-100 border-pink-500",
  },
  purple: {
    primary: "bg-purple-600 hover:bg-purple-500 text-white",
    secondary: "bg-purple-800 hover:bg-purple-700 text-purple-200",
    secondaryBorder:
      "bg-purple-800 hover:bg-purple-700 text-purple-200 border-purple-700",
    secondaryTextLight: "bg-purple-800 hover:bg-purple-700 text-purple-100",
    badge: "bg-purple-600 text-white",
    badgeMuted: "bg-purple-900 text-purple-200",
    ring: "focus:ring-purple-500",
    gradient: "from-purple-900/20 to-purple-800/20",
    gradientText: "text-purple-300/60 group-hover:text-purple-300/80",
    tag: "bg-purple-500/20 text-purple-300",
    cartBadge: "bg-purple-600 text-purple-100 border-purple-500",
  },
  yellow: {
    primary: "bg-yellow-600 hover:bg-yellow-500 text-white",
    secondary: "bg-yellow-800 hover:bg-yellow-700 text-yellow-200",
    secondaryBorder:
      "bg-yellow-800 hover:bg-yellow-700 text-yellow-200 border-yellow-700",
    secondaryTextLight: "bg-yellow-800 hover:bg-yellow-700 text-yellow-100",
    badge: "bg-yellow-600 text-white",
    badgeMuted: "bg-yellow-900 text-yellow-200",
    ring: "focus:ring-yellow-500",
    gradient: "from-yellow-900/20 to-yellow-800/20",
    gradientText: "text-yellow-300/60 group-hover:text-yellow-300/80",
    tag: "bg-yellow-500/20 text-yellow-300",
    cartBadge: "bg-yellow-600 text-yellow-100 border-yellow-500",
  },
  emerald: {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-emerald-800 hover:bg-emerald-700 text-emerald-200",
    secondaryBorder:
      "bg-emerald-800 hover:bg-emerald-700 text-emerald-200 border-emerald-700",
    secondaryTextLight: "bg-emerald-800 hover:bg-emerald-700 text-emerald-100",
    badge: "bg-emerald-600 text-white",
    badgeMuted: "bg-emerald-900 text-emerald-200",
    ring: "focus:ring-emerald-500",
    gradient: "from-emerald-900/20 to-emerald-800/20",
    gradientText: "text-emerald-300/60 group-hover:text-emerald-300/80",
    tag: "bg-emerald-500/20 text-emerald-300",
    cartBadge: "bg-emerald-600 text-emerald-100 border-emerald-500",
  },
  blue: {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary: "bg-blue-800 hover:bg-blue-700 text-blue-200",
    secondaryBorder:
      "bg-blue-800 hover:bg-blue-700 text-blue-200 border-blue-700",
    secondaryTextLight: "bg-blue-800 hover:bg-blue-700 text-blue-100",
    badge: "bg-blue-600 text-white",
    badgeMuted: "bg-blue-900 text-blue-200",
    ring: "focus:ring-blue-500",
    gradient: "from-blue-900/20 to-blue-800/20",
    gradientText: "text-blue-300/60 group-hover:text-blue-300/80",
    tag: "bg-blue-500/20 text-blue-300",
    cartBadge: "bg-blue-600 text-blue-100 border-blue-500",
  },
};

const defaultTheme = colorMap.teal;

export function getButtonTheme(color: string | undefined): ButtonThemeClasses {
  if (!color || !(color in colorMap)) {
    return defaultTheme;
  }
  return colorMap[color as ButtonColorName] ?? defaultTheme;
}
