# Gershon.AI Design System

**Shared across every gershonCRM platform** (company, finance, client, social, …).
The canonical source of truth is `finance.gershoncrm.com`. Treat the rules below as immutable; if you need to change one, change it everywhere at once.

---

## 1. Brand identity

- **Wordmark:** `Gershon.AI` in 800-weight, tracking `-0.02em`, color `var(--brand)`.
- **Sub-label:** small uppercase line below the wordmark naming the platform (`COMPANY`, `FINANCE`, `CLIENT`, etc.), tracking `0.18em`, 10-11px, `var(--text-muted)`.
- **Version block:** below the sub-label, `v{semver}` + build timestamp. Format: `May 17, 2026, 12:16 PM EDT`.
- **Logo color:** the brand indigo `#6366f1`. **All brand colors derive from the Gershon.AI logo** — never repaint the logo, and never use a different primary color on a Gershon-family product. If you ever need to change `--brand`, propagate that change to every CSS file across every gershonCRM.* repo in the same PR.

## 2. Color tokens (CSS variables)

Defined in `app/globals.css` (Next.js) or `<style>` block (legacy SPA pages):

```css
:root {
  /* Brand — derived from the Gershon.AI logo */
  --brand:       #6366f1;   /* indigo-500  */
  --brand-dark:  #4338ca;   /* indigo-700  — hover state, gradient endpoint */
  --brand-light: #eef2ff;   /* indigo-50   — hover bg, eyebrow pill, focus halo */

  /* Neutrals */
  --bg:          #f8fafc;   /* slate-50    — app background */
  --card:        #ffffff;   /* card background */
  --text:        #1f2937;   /* gray-800    — primary text */
  --text-muted:  #64748b;   /* slate-500   — secondary text */
  --border:      #e5e7eb;   /* gray-200    — card + divider borders */

  /* Semantic accents — same on every platform */
  --success: #10b981;  /* emerald-500 — closed deals, met goals, healthy */
  --warning: #f59e0b;  /* amber-500   — at-risk, near-threshold */
  --danger:  #dc2626;  /* red-600     — overdue, broken, critical */
  --rose:    #f43f5e;  /* rose-500    — alt warning for negative deltas */
  --info:    #0ea5e9;  /* sky-500     — info banners, neutral charts */
  --violet:  #8b5cf6;  /* violet-500  — secondary accent for series */

  /* Layout */
  --sidebar-w: 232px;
  --topbar-h:  56px;
}
```

**Rules:**
- Never inline a hex value that has a token. `bg-[#6366f1]` → use `bg-[color:var(--brand)]`.
- Never invent a new brand color. New shade needed? Add it here first.
- Chart series colors follow the semantic accents (success = green for "good", warning = amber for "needs attention", etc.).

## 3. Typography

- **Font:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Headings:** weight `800` (extrabold), `tracking-tight`.
  - H1 page title: `text-2xl font-extrabold tracking-tight text-gray-900`
  - H3 card title: `text-sm font-bold text-gray-700`
- **Eyebrow / section label:** `text-[10px] font-bold tracking-[0.18em] uppercase text-gray-500`
- **Body:** 14px (`text-sm`), `text-gray-700` or `text-gray-800`.
- **Caption:** 12px (`text-xs`), `text-gray-500` or `text-gray-400`.
- **Tabular numerics:** add `tabular-nums` for tables and KPI values.

## 4. Layout: left sidebar shell

Every Gershon.AI platform uses the same shell.

```
┌──────────────┬───────────────────────────────────────────┐
│ SIDEBAR      │ MAIN                                       │
│ 232px wide   │ flex-1, padding 24-40px                    │
│ sticky       │ scrolls vertically                         │
│              │                                            │
│ [wordmark]   │ [page header]                              │
│ [sub-label]  │                                            │
│ [version]    │ [content sections]                         │
│ ─── group ──│                                            │
│ ▸ nav item   │                                            │
│ ▸ nav item   │                                            │
│ active item  │                                            │
│ ─── group ──│                                            │
│ ▸ Settings   │                                            │
└──────────────┴───────────────────────────────────────────┘
```

- Sidebar bg: white. Border-right: 1px `var(--border)`.
- Sidebar is `position: sticky; top: 0; height: 100vh; overflow-y: auto`.
- Items: `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold`.
- Active item: `bg-[color:var(--brand)] text-white shadow-sm`.
- Hover (non-active): `bg-[color:var(--brand-light)] text-[color:var(--brand)]`.
- Group dividers: small uppercase label (`text-[10px] tracking-[0.16em] text-gray-400 uppercase`).

## 5. Information architecture (menu rules)

Every Gershon.AI platform's sidebar follows this grouping pattern:

1. **Primary nav** (no heading) — the day-to-day tabs in this order:
   - `Dashboard` — at-a-glance snapshot of current state.
   - `Analysis` — drill-down, charts, time-range filters, click-to-explore.
   - `SWOT` — strategic VP-of-Sales narrative + 2×2 SWOT grid.
   - `Warnings` — stale leads, blockers, things needing attention.
   - `Values` — money / pipeline-value calc using business assumptions.
   - `Objectives` — KPI targets, week-over-week evolution, reference tables.

   Order can be adapted per platform, but `Dashboard` is always first and primary names stay the same. (`Invoices`, `Clients`, `Trends`, `Goals`, `Valuation`, `Bank` etc. live in the same primary slot when they fit the platform's domain.)

2. **REPORTS** section — uppercase eyebrow.
   - `Monthly Reports` (persona-tabbed: CEO / VP Sales / Ops on company, CFO / CEO / VP Sales on finance, etc.).
   - `Exec Reports`, `MoM Evolution`, etc. live in this group.

3. **INTEGRATIONS** section — uppercase eyebrow.
   - `Extract Data` — the canonical JSON endpoint exposing business assumptions for cross-platform consumption.
   - `Google Sheets` — IMPORTDATA-friendly endpoints listed with copy buttons.

4. **CONFIGURATION** section — uppercase eyebrow.
   - `Settings` — credentials + business assumptions.

## 6. Card style (the building block)

```html
<div class="bg-white rounded-xl shadow p-5 border-t-4 border-[color:var(--brand)]">
  <h3 class="text-sm font-bold text-gray-700 mb-1 flex items-center">
    <Icon /> Card title
    <span class="ml-auto text-xs font-normal text-gray-400">caption</span>
  </h3>
  <p class="text-xs text-gray-400 mb-3">Short subtitle explaining what this card shows.</p>
  …content…
</div>
```

- Always `bg-white rounded-xl shadow p-5`.
- KPI tiles get a colored top border `border-t-4 border-{accent}-500` (brand for primary, success/warning/danger/yellow for status).
- Section titles use a Lucide icon inline, color-matched to the section's intent.

## 7. KPI tile

```html
<div class="bg-white rounded-xl shadow p-5 border-t-4 border-[color:var(--brand)]">
  <div class="flex items-center gap-2 mb-1">
    <Icon /> <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">LABEL</p>
  </div>
  <p class="text-3xl font-extrabold text-gray-900 tracking-tight">123</p>
  <p class="text-sm mt-1 text-emerald-600 font-medium">↑ +12 vs last month</p>
</div>
```

- Label: `text-xs font-semibold text-gray-500 uppercase tracking-wide`
- Value: `text-3xl font-extrabold text-gray-900 tracking-tight`
- Delta: green for positive, red for negative, gray for flat. Always say "vs last month" / "vs goal" / "vs last week" — never a bare number.

## 8. Charts

- Use `recharts` (Next.js apps) or Chart.js (legacy SPA pages). Same color scheme either way.
- **Primary series:** `var(--brand)` (#6366f1).
- **Success / closing / closed:** `var(--success)` (#10b981).
- **Warning / removed / recycled:** `var(--warning)` (#f59e0b).
- **Negative / overdue:** `var(--danger)` (#dc2626).
- Bars: `radius={[6, 6, 0, 0]}`. Tooltip styled: `borderRadius: 12, border: 1px solid #e5e7eb`.
- Interactive charts must support: hover tooltip, click-to-drill (where useful), and a time-range pill switcher (3 / 6 / 12 / 24 mo).
- Every chart card includes a 1-2 line plain-English caption ABOVE the chart explaining what it shows, and a 1-line analysis BELOW explaining what the user should conclude from it.

## 9. Tabs (persona / view selectors)

Used in Reports, Settings, etc. Pill style:

```html
<button class="bg-[color:var(--brand)] text-white border border-[color:var(--brand)] shadow-sm
               flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold">
  active tab
</button>
<button class="bg-white text-gray-700 border border-gray-200
               hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]
               flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold">
  inactive tab
</button>
```

## 10. Pill buttons

Primary CTA: solid brand bg + white text. Secondary: white bg + gray border. Both fully rounded (`rounded-full`).

```html
<!-- Primary -->
<button class="bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)]
               text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-sm">
  Save
</button>
<!-- Secondary -->
<button class="bg-white border border-gray-200 hover:border-[color:var(--brand)]
               hover:text-[color:var(--brand)] text-gray-700 text-sm font-bold
               px-5 py-2.5 rounded-full">
  Test
</button>
```

## 11. IMPORTDATA / cross-platform contracts

Every gershonCRM.* platform must expose:

- `/api/sheets` — plain-text directory of every IMPORTDATA endpoint with copy-paste examples.
- `/api/sheets/total` — total entity count (leads / clients / invoices / etc.) as plain text.
- `/api/sheets/{dimension}/{value}/count` — count by a specific dimension (stage, priority, status, …).
- `/api/extract/business-assumptions` — JSON with shared business KPIs (avgInvoiceValue, conversion rates, etc.). Gated by `X-Service-Key` header for server-to-server.

All endpoints return HTTP 200 with parseable bodies even on error (so IMPORTDATA never says "Could not fetch URL").

## 12. Versioning + build timestamp

Every Gershon.AI platform's sidebar shows `v{semver}` plus the build timestamp in `America/New_York`. Format the date in the **same timezone on both server and client** to avoid hydration mismatches (Next.js: `toLocaleDateString("en-US", { ..., timeZone: "America/New_York" })`).

## 13. When in doubt

1. Open `finance.gershoncrm.com`, copy its pattern.
2. If `finance` doesn't have an example, ask Olivier.
3. Never invent a new visual pattern without updating this doc first.
