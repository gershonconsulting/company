# Gershon.AI · Left Sidebar Design Standard

> **Source:** https://docs.google.com/document/d/1GHRgvnvmozPWWXOoH4ELo-s9XPROWVUXg_NAFL3m_jU/edit
>
> This file is a mirror of the authoritative Google Doc. If the Doc and this file disagree, the Doc wins. When the Doc updates, update this file.

Every Gershon.AI product shares one left sidebar so the whole suite feels like one company. This document is the single source of truth for the sidebar.

## 1. Naming convention

The product has a name and the suffix "by Gershon.AI":
- `radar.gershonCRM.com` → **Radar by Gershon.AI**
- `social.gershonCRM.com` → **Social by Gershon.AI**
- `company.gershonCRM.com` → **Company by Gershon.AI**

The big word is the product name. The eyebrow is `BY GERSHON.AI`. Never show just "Gershon.AI" as the app name.

## 2. Anatomy (top → bottom)

```
┌────────────────────────────┐
│ ◈ <Product>                │  Brand: pulse logo + product name
│   BY GERSHON.AI            │  Eyebrow
├────────────────────────────┤
│ v1.5.3                     │  Version number (bump every deploy)
│ Last release: Jul 3, 2026  │  Date of last release
├────────────────────────────┤
│ ▸ Dashboard                │  Nav — grouped by section
│ PIPELINE                   │
│ ▸ Analysis  ▸ SWOT …       │
│ REPORTS                    │
│ ▸ Monthly Reports          │
│                            │  (flex spacer pushes footer down)
├────────────────────────────┤
│ ⚙  Settings                │  FOOTER (pinned to bottom), in order:
│ ✨ Demo mode  (fake data)  │   1) Settings  (top)
│ ⎋  Log out                 │   2) Demo mode (fake data)
│    <domain>                │   3) Log out   (very bottom)
└────────────────────────────┘   + domain line
```

## 3. Required elements

Every Gershon.AI sidebar MUST include, in these positions:

| Element                    | Position                    | Purpose                                   |
|----------------------------|-----------------------------|-------------------------------------------|
| Product + "by Gershon.AI"  | top brand block             | identity                                  |
| Version number             | meta block                  | which build is live                       |
| Date of last release       | meta block                  | freshness / changelog anchor              |
| Grouped nav items          | middle, scrollable          | the app's pages                           |
| Settings                   | footer, top of the group    | config, keys, account                     |
| Demo mode (fake data)      | footer, below Settings      | populated demo without touching real data |
| Log out                    | footer, at the very bottom  | ends the session, red-accented            |
| Domain                     | under Log out               | which app you're in                       |

## 4. Design tokens

- **Brand indigo:** `--brand: #6366f1`. Ink: `--brand-ink: #4f46e5`. Soft tint: `--brand-soft: #eef0fe`. Product name and active nav use `--brand-ink` on `--brand-soft`.
- **Surface:** `#ffffff` sidebar on `#f8fafc` page, hairline border `#eef0f4` (`--side-line`).
- **Logout accent:** text `#dc2626`, hover bg `#fee2e2` — the ONLY destructive-colored control.
- **Type:** system sans; product name 800 weight; eyebrows & section labels `0.66rem / 700 / 0.13em uppercase / muted`; nav items `0.92rem / 600`.
- **Icons:** thin-stroke outline (Feather-style, `stroke-width: 2`), 18px in nav, 24px logo. Pulse/activity SVG for the logo across the suite.
- **Width:** 250px desktop; full-width stacked on ≤880px.
- **Radius:** 9px nav items, 11px footer buttons, 12px cards.

## 5. Behavior

- **Version + release date** — single source of truth in code, bumped on every deploy.
- **Demo mode** — swaps live API data for a bundled fake dataset so a prospect can click through the app fully-populated without touching the backend. When ON, the button label reads **"Live data"** (so the click swaps back) and a subtle "Demo" badge shows on the page. Demo mode NEVER writes to the backend.
- **Log out** — for authed apps, navigates to `/api/auth/logout`; for others, clears session and returns to sign-in. Always at the bottom, always red-accented.
- **Active state** — current nav item gets `--brand-soft` background + `--brand-ink` text.

## 6. Responsive & a11y

- **≤880px:** sidebar collapses to a top bar; nav wraps horizontally; meta block + section labels + footer group hidden (Settings / Logout live in an overflow menu).
- Every control is a real `<button>` or `<a>` with an accessible label. Icons are decorative (`aria-hidden`).
- Contrast: 4.5:1 minimum. The muted grays and brand indigo pass on white.

## 7. Reference implementation

**Live:** company.gershonCRM.com (this repo).
**Files:**
- `components/Sidebar.tsx` — the sidebar itself.
- `lib/version.ts` — `APP_VERSION` + `RELEASE_DATE` constants (bumped by the deploy workflow's version-patch step).
- `lib/demo-context.tsx` — `DemoProvider` + `useDemo()` hook.
- `lib/demo-data.ts` — bundled fake dataset.
- `app/globals.css` — canonical CSS variables.

## 8. QA checklist (before ship)

- [ ] Brand reads **`<Product>`** with a **`BY GERSHON.AI`** eyebrow — not "Gershon.AI" alone.
- [ ] Version number is visible and matches the deployed build.
- [ ] `Last release: <date>` is present and correct.
- [ ] Footer order is **Settings → Demo mode → Log out**, with Log out at the very bottom (red).
- [ ] Demo mode fully populates the UI with fake data and NEVER writes to the backend.
- [ ] Log out ends the session.
- [ ] Collapses cleanly on mobile (≤880px).
