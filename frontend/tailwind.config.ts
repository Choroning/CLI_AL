import type { Config } from "tailwindcss";

/**
 * Tokens mirror DESIGN.md (Linear-style dark canvas + lavender accent).
 *
 * Light/dark mode switching is done via CSS variables (see globals.css). Each
 * Tailwind token below resolves to a `var(--...)`, and the `.dark` class on
 * <html> swaps the variable values. This keeps a single class set
 * (`bg-canvas`, `text-ink`, ...) usable in both themes.
 *
 * Color usage discipline (do NOT relax without consulting DESIGN.md):
 *   - `primary.*` (lavender) is the ONLY chromatic accent. Brand mark, primary
 *     CTA, focus ring, link emphasis. Never used as a fill for sections / cards.
 *   - `success.DEFAULT` is the only allowed semantic color (success indicator).
 *   - All other depth comes from the surface ladder + 1px hairline borders.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Hybrid 7 — Toss-friendly blue. Replaces Linear lavender.
        primary: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          focus: "#1d4ed8",
          soft: "#dbeafe",
          on: "#ffffff",
        },
        success: {
          DEFAULT: "#16a34a",
          soft: "#dcfce7",
        },
        danger: {
          DEFAULT: "#dc2626",
          soft: "#fee2e2",
        },
        warning: {
          DEFAULT: "#d97706",
          soft: "#fef3c7",
        },
        focus: {
          DEFAULT: "#facc15",
        },
        // Theme-switched tokens (CSS vars defined in globals.css).
        canvas: "var(--canvas)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          4: "var(--surface-4)",
        },
        hairline: {
          DEFAULT: "var(--hairline)",
          strong: "var(--hairline-strong)",
          tertiary: "var(--hairline-tertiary)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
          tertiary: "var(--ink-tertiary)",
        },
      },
      fontFamily: {
        // Pretendard handles Korean glyphs; Inter handles Latin/digits.
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Geist Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        // Type scale (2026-05-04 v3):
        //   - Floor for reading content: body-lg / body / body-sm @ 1.125rem (~20.3px)
        //   - Tertiary tokens dropped below the floor:
        //       button @ 1rem (~18px) — buttons feel like buttons, not body
        //       eyebrow / caption @ 0.875rem (~15.75px) — meta info, section labels
        //   - Eyebrow: no uppercase / no positive tracking (irrelevant for Korean)
        //   - Display tokens stay in px; rem-based tokens scale with html font-size.
        "display-xl": ["80px", { lineHeight: "1.05", letterSpacing: "-0.0375em", fontWeight: "600" }],
        "display-lg": ["56px", { lineHeight: "1.10", letterSpacing: "-0.032em", fontWeight: "600" }],
        "display-md": ["40px", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        headline: ["36px", { lineHeight: "1.20", letterSpacing: "-0.021em", fontWeight: "600" }],
        "card-title": ["1.625rem", { lineHeight: "1.30", letterSpacing: "-0.018em", fontWeight: "500" }],  // ~29.3px
        subhead: ["1.375rem", { lineHeight: "1.55", letterSpacing: "-0.01em", fontWeight: "400" }],        // ~24.8px
        "body-lg": ["1.125rem", { lineHeight: "1.70", letterSpacing: "0", fontWeight: "400" }],            // ~20.25px (floor reference)
        body: ["1.125rem", { lineHeight: "1.70", letterSpacing: "0", fontWeight: "400" }],                  // floor
        "body-sm": ["1.125rem", { lineHeight: "1.65", letterSpacing: "0", fontWeight: "400" }],            // floor
        button: ["1rem", { lineHeight: "1.20", letterSpacing: "0", fontWeight: "500" }],                    // ~18px (below floor — interaction)
        caption: ["0.875rem", { lineHeight: "1.50", letterSpacing: "0", fontWeight: "400" }],              // ~15.75px (meta)
        eyebrow: ["0.875rem", { lineHeight: "1.40", letterSpacing: "0", fontWeight: "500" }],              // ~15.75px (section label, K-friendly)
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
      },
      spacing: {
        section: "96px",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
