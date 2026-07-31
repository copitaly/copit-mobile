# COP Italy Mobile Design System

This lightweight design system captures the visual language already proven in the mobile app without moving routed layout control into shared components.

## Tokens

Defined in [`src/global.scss`](src/global.scss):

- Color tokens: `--cop-color-background`, `--cop-color-surface`, `--cop-color-navy`, `--cop-color-gold`, text and border variants.
- Surface tokens: `--cop-shadow-card`, `--cop-shadow-card-soft`, `--cop-radius-card`, `--cop-radius-card-compact`, `--cop-radius-control`, `--cop-radius-pill`.
- Spacing tokens: `--cop-space-*`, `--cop-page-padding-*`.
- Typography tokens: `--cop-eyebrow-size`, `--cop-title-size-*`, `--cop-reading-size`, `--cop-reading-line-height`.

## Shared Visual Primitives

These are semantic CSS primitives, not routed layout components.

- `.cop-page`, `.cop-page--warm`
  - Page background surfaces.
- `.cop-page-shell`
  - Shared padded vertical stack for scrollable screen content.
- `.cop-page-header`
  - Standard editorial header wrapper.
- `.cop-page-header__eyebrow`
  - Small uppercase gold label.
- `.cop-page-header__title`
  - Primary page heading.
- `.cop-page-header__subtitle`
  - Secondary introductory copy.
- `.cop-card`
  - Default white floating card.
- `.cop-card--soft`
  - Softer shadow variant used in Profile/auth cards.
- `.cop-card--compact`
  - Slightly tighter radius used in list and utility cards.
- `.cop-card--reflection`
  - Cool inset reflection surface.
- `.cop-card--prayer`
  - Warm cream prayer surface.
- `.cop-eyebrow`
  - Reusable section/metadata eyebrow.
- `.cop-metadata`
  - Secondary metadata row text.
- `.cop-reading-body`
  - Editorial reading typography for article and long-form content.
- `.cop-inset-quote`
  - Scripture/quote accent treatment.
- `.cop-button-primary`
  - Shared gold primary CTA treatment.
- `.cop-button-secondary`
  - Shared pill secondary action.

## Shared Form Styling

Existing auth field primitives now resolve through global styles:

- `.auth-form`
- `.auth-label`
- `.auth-field`, `.auth-field--pill`
- `.field-error`
- `.password-toggle`
- `.auth-feedback`
- `.auth-submit`
- `.auth-link`, `.forgot-link`

Login, Create Account, and Forgot Password keep only local layout tweaks in their component styles.

## Current Consumers

Migrated in this pass:

- Home
- Profile
- Embedded Sign In
- Embedded Create Account
- Embedded Forgot Password
- Devotionals
- Devotional Reader

## Guardrails

- Shared primitives must not own `ion-page`, `ion-content`, router outlets, or tab-shell structure.
- Feature pages remain responsible for navigation, scrolling, safe-area decisions, and page-specific responsive layout.
- Add new shared primitives only when at least two screens need the same visual treatment.
