# company (company.gershoncrm.com) STATUS
Updated 2026-11-14. Version in main after PR #7: 1.0.55 (deploy workflow then auto-bumps patch, so live shows 1.0.56+).

## Done
- v1.0.55: indigo leftovers replaced by brand red #FE1B04 / neutral slate (PR #7)

## Open
- tsc --noEmit: 20 errors, identical on main and PR (pre-existing, not introduced); next build passes
- Old unified-design PR #2 and HANDOFF-only PR #4 closed as obsolete

## Deploy route
Merge to main -> .github/workflows/deploy.yml: bumps patch version, next-on-pages build, wrangler pages deploy to gershon-company and gershoncrm-company.
