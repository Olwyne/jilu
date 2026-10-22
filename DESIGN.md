---
name: Jilu
description: A calm, dark, poster-led tracker for everything you watch, read and play.
colors:
  blackout: "#0a0a0f"
  screen-white: "#ECECF2"
  dim-lavender: "#9797a8"
  dim-lavender-2: "#8c8ca0"
  dim-lavender-3: "#8585a0"
  projector-violet: "#8b6dff"
  violet-fill: "#7050ee"
  violet-fill-deep: "#6340e0"
  poster-pink: "#ff5c8a"
  marquee-gold: "#ffc24b"
  signal-green: "#4ade80"
  sky-blue: "#38bdf8"
  danger-fill: "#dc2626"
  danger-text: "#ff8fab"
  modal-slate: "#15151d"
  menu-slate: "#1c1c2e"
  tick-grey: "#4a4a58"
  surface-tint: "rgba(255,255,255,0.025)"
  row-tint: "rgba(255,255,255,0.04)"
  chip-tint: "rgba(255,255,255,0.05)"
  hairline: "rgba(255,255,255,0.07)"
  hairline-strong: "rgba(255,255,255,0.10)"
  violet-wash: "rgba(139,109,255,0.14)"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7.4vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Instrument Sans', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Instrument Sans', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.violet-fill}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.violet-fill-deep}"
  button-secondary:
    backgroundColor: "rgba(0,0,0,0)"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-danger-outline:
    backgroundColor: "rgba(255,92,138,0.10)"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  chip:
    backgroundColor: "{colors.chip-tint}"
    textColor: "{colors.dim-lavender}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  chip-active:
    backgroundColor: "{colors.violet-fill}"
    textColor: "#ffffff"
  card:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.lg}"
    padding: "22px"
  input:
    backgroundColor: "{colors.chip-tint}"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
---

# Design System: Jilu

## Overview

**Creative North Star: "The Poster Wall"**

Jilu is a dark room lit by cover art. Surfaces are near-black and recede; the posters, a single violet accent and the occasional pink do all the colouring. The interface behaves like the wall a collection hangs on: it holds things at a calm, even distance and never competes with the artwork. A person opens it many times a day for a few seconds (tick an episode, check what airs next), so the system rewards recognition over discovery: everything is where the last visit left it.

The mood is calm and confident. Content leads, chrome is quiet, and the accent is rare enough to mean something: "do this" or "this is selected". Type does the personality work, through a tight, heavy display face over a friendly neutral body. The app is dark-first, with a complete light theme built from the same roles (not an inversion). Marketing and legal pages use the same tokens: the landing page follows the visitor's OS scheme, the legal pages stay light for reading.

**Key Characteristics:**
- Tonal layers and hairline borders instead of shadows; shadows only on things that float.
- One violet voice for actions and selection; pink, gold, green and blue are semantic or decorative accents, never competing CTAs.
- Soft, generous radii (8 to 22px); pills for filters.
- Heavy Bricolage Grotesque headings, Instrument Sans body, 12px minimum text.
- Every colour is a semantic token with a value per theme; components never hold hex literals.

## Colors

A near-black canvas, translucent white layers, one electric violet, and a small family of signal colours. Every role has a dark and a light value; the frontmatter lists the dark values (the default world), and the light values are given per role below.

### Primary
- **Projector Violet** (#8b6dff dark, #6a4ce0 light): the accent as light cast on the wall. Used for selected states, links, focus rings, active nav text, and text-sized accents. Never as a fill behind white text (it fails AA on dark).
- **Violet Fill** (#7050ee dark, #6a4ce0 light; hover #6340e0 dark, #5a3cd0 light): the filled-button and active-chip background. White text on it passes AA in both themes (5.16 and 5.64).

### Secondary
- **Poster Pink** (#ff5c8a dark, #c91d52 light): the second stop of the brand gradient, the "to catch up" badge, and the warm half of the logo. Paired with dark text (`on-pink`) on dark, white on light.

### Tertiary
- **Marquee Gold** (#ffc24b dark, #946000 light): ratings and favourites.
- **Signal Green** (#4ade80 dark, #157a38 light): completion, "public", correct answers. Text on it is dark in dark mode, white in light.
- **Sky Blue** (#38bdf8 dark, #0369a1 light): "in progress" status.
- **Danger** (fill #dc2626 both themes; text #ff8fab dark, #c01f56 light): destructive actions and errors. White text on the fill is 4.83:1.

### Neutral
- **Blackout** (#0a0a0f dark, #f2f2f7 light): the page.
- **Screen White** (#ECECF2 dark, #1a1a2e light): primary text.
- **Dim Lavender** (#9797a8; -2 #8c8ca0; -3 #8585a0 dark; #5f5f76, #606078, #666680 light): secondary text in three steps. All three pass 4.5:1 on every surface in both themes.
- **Modal Slate / Menu Slate** (#15151d / #1c1c2e dark, both #ffffff light): dialog and dropdown backgrounds.
- **Surface Tint, Row Tint, Chip Tint** (rgba white at 2.5%, 4%, 5% on dark; near-white at 88% and 60%, black at 6% on light): the three tonal layers over the page.
- **Hairline / Hairline Strong** (rgba white 7% / 10% on dark; black 8% / 12% on light): borders and dividers.
- **Violet Wash** (rgba of the accent at 14%, 12% on light): selected rows and active nav.

### Named Rules
**The One Violet Rule.** Violet marks the action or the selection on a screen. Status and category colours stay in their own lanes and never become a second call to action.

**The Token-Or-Nothing Rule.** Components reference semantic variables (`--color-accent-fill`, `--color-green`, `--color-danger-text`). A hex literal in a component is a bug, because it cannot change with the theme and cannot be checked for contrast.

**The Paired-Text Rule.** A coloured fill always names its text colour (`on-accent`, `on-pink`, `on-green`). White on the bright dark-theme accent, pink or green is not allowed.

## Typography

**Display Font:** Bricolage Grotesque (variable, with system-ui)
**Body Font:** Instrument Sans (variable, with system-ui)

**Character:** a tight, heavy display face for the voice, over a neutral, friendly body. Headlines carry weight and tracking; body copy stays quiet and readable.

### Hierarchy
- **Display** (800, clamp(2.75rem, 7.4vw, 5.5rem), 1.02, -0.035em): landing hero only.
- **Headline** (800, clamp(1.9rem, 4vw, 3rem), 1.08, -0.03em): landing section titles, legal page titles.
- **Title** (700, 26px, 1.1, -0.02em): page title in the app header; 20-22px for modal and card titles.
- **Body** (400, 14px app / 16px marketing, 1.6): lists, descriptions, forms. Reading blocks stay within 65 to 70ch.
- **Label** (600, 12px, 1.2): chips, badges, captions, metadata. 12px is the floor for any text.

### Named Rules
**The Twelve-Pixel Floor Rule.** No text under 12px, including badges and counts.

**The Weight-Not-Gradient Rule.** Emphasis comes from weight, size or the single violet; never gradient text.

## Layout

An app shell of a 236px sticky sidebar plus a sticky header on desktop, and a 64px fixed bottom tab bar on screens under 860px. Content is a single fluid column with generous gutters (20 to 30px). Libraries are an auto-fill grid of poster cards (158px minimum, fluid, 20px by 18px gaps); marketing pages use a 1120px container with 40px gutters. Spacing is a 4/8/12/16/24/40 scale; related controls sit 6 to 10px apart and sections 24 to 40px apart.

Breakpoints are few: 860px switches the app between sidebar and tab bar; 720 and 820px reflow marketing rows; 480px shortens the landing nav label. Touch (`pointer: coarse`) gets a 44x44 hit area on every button and pressable through a pseudo-element, without changing layout.

## Elevation & Depth

Depth is tonal first. Surface Tint, Row Tint and Chip Tint stack over Blackout, and Hairline borders separate them; nothing at rest carries a shadow. Shadows exist only on things that float above the page.

### Shadow Vocabulary
- **Menu** (`box-shadow: 0 8px 32px var(--color-shadow-lg)`): dropdowns, selects, toasts.
- **Dialog** (`box-shadow: 0 30px 80px var(--color-shadow-lg)`): modals and the search palette, over a 65% black scrim.
- **Poster edge** (`box-shadow: 2px 0 8px rgba(0,0,0,0.2)`): the poster thumbnail inside a calendar card.

### Named Rules
**The Flat-Until-Floating Rule.** A surface gets a shadow only when it overlaps content. Cards, rows and chips never do.

## Shapes

Soft and generous. Controls are 10 to 12px, cards 16 to 18px, dialogs and hero imagery 22 to 24px, filters and tabs are full pills, and avatars are circles. Posters keep a 12 to 14px radius at a 2:3 ratio and are the only rectangles with a visible image edge. The logo is a rounded square (18px on a 64px grid) holding a drawn "J".

## Components

### Buttons
- **Shape:** 12px radius (10px small, 13px large), 1px border, weight 600.
- **Primary:** Violet Fill with white text, 10px 20px padding; hover steps to Violet Fill Deep over 150ms.
- **Secondary:** transparent with a Hairline Strong border and Screen White text; hover adds a Chip Tint wash.
- **Danger:** solid Danger fill with white text for confirm steps; Danger Outline (tinted wash, Danger Text, tinted border) for entry points.
- **States:** disabled drops to 50% opacity with a not-allowed cursor; busy sets `aria-busy` and a wait cursor.

### Chips
- **Style:** 20px pill, Chip Tint fill, Hairline Strong border, Dim Lavender text; 7px 14px padding, 13px (12px small).
- **State:** active is Violet Fill with white text and weight 600; a muted count follows the label; disabled chips sit at 45% opacity and may carry a floating "coming soon" badge. The compact variant (8px radius, no border) is used for sort and status filters.

### Cards / Containers
- **Corner Style:** 18px (16px dense, for list rows).
- **Background:** Surface Tint over the page, with a 1px Hairline border (Hairline Strong for emphasis); `clip` hides overflow for list containers.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 22px standard, 18px 20px compact.

### Inputs / Fields
- **Style:** Chip Tint fill, Hairline Strong border, 10 to 12px radius, 11px 14px padding, Screen White text.
- **Focus:** a 2px Projector Violet ring with a 1px offset, enforced globally so inline `outline: none` cannot remove it.
- **Error / Disabled:** errors announce with `role="alert"` and Danger Text; fields are marked `aria-invalid`.

### Navigation
- **Sidebar** (desktop): 236px, tinted surface, 12px-radius rows; the active row takes Violet Wash with full-weight text and a count badge in Poster Pink.
- **Tab bar** (mobile): 64px, blurred translucent surface, five icon-over-label items, active in Projector Violet; labels are 12px.
- **Header:** sticky, blurred, with a 44px search icon button and a round brand-gradient avatar button.

### Select (listbox)
A 13px-radius trigger tinted by the selected status colour with a leading dot and a caret; the list is a Menu-slate listbox with arrow-key, Home/End and Escape support and a dot per option.

### Poster card
The signature component: a 2:3 cover (14px radius) that fills its grid cell, a 4px violet-to-pink progress bar inset 9px along the bottom edge while a title is started but unfinished, a gold star at the top right for favourites, then the title (600, 14.5px) and a muted "category, year" caption (12.5px) with the rating at the far end. Posters are the one place where colour is allowed to be loud.

### Dialogs and toasts
Dialogs use the shared `Modal` (labelled, focus-trapped, Escape closes, focus returns) on a 65% scrim. They rise in over 260ms; toasts slide up over 280ms. Both use `cubic-bezier(0.16, 1, 0.3, 1)` and fall back to a 120ms fade under reduced motion.

## Do's and Don'ts

### Do:
- **Do** reference semantic tokens for every colour; give each new role a dark and a light value and check it against the three surface colours.
- **Do** pair every coloured fill with its `on-*` text token.
- **Do** keep text at 12px or larger and body copy under 70ch.
- **Do** use Button, Chip, IconButton, Card, StarRating, Select and Modal before writing inline styles.
- **Do** give every control an accessible name, a visible 2px focus ring, and a 44px touch target.
- **Do** make motion state-bearing and short (120 to 300ms, ease-out), with an opacity-only reduced-motion path.

### Don't:
- **Don't** put white text on `--color-accent` (Projector Violet) or on the dark-theme pink or green; it fails AA.
- **Don't** hard-code hex colours, or append an alpha byte to a variable; use `color-mix` for washes.
- **Don't** add shadows to cards, rows or chips at rest.
- **Don't** use gradient text, emoji as icons, or fake browser chrome around screenshots.
- **Don't** make a second violet call to action on the same screen.
- **Don't** hide an overlay's focus ring with `outline: none`; the global field ring is the standard.
