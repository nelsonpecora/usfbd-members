# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start Vite dev server
yarn build        # Production build (outputs to build/)
yarn preview      # Preview production build
yarn lint         # Run oxlint with auto-fix
yarn format       # Run oxfmt formatter
yarn format:check # Check formatting without writing
yarn typecheck    # Run tsc --noEmit
yarn test         # Run vitest (watch mode)
yarn test --run   # Run tests once
yarn test <file>  # Run a single test file

# Data management
yarn clean:members       # Delete all src/data/members/*.yml files
yarn generate:info       # Fetch member data from Google Sheets and regenerate yml files
```

`generate:info` requires a `.env` file with `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.

## Architecture

This is a member portal for the US Federation of Battodo (a Japanese sword art). The key design constraint is **client-side authentication without a backend**: member data is embedded in the built HTML, and login works by hashing a member's name (using cyrb53) and comparing it against a `window.hashes` map injected into every page.

### Build pipeline

- **Vite** + **vitto** plugin (SSG) — vitto handles static site generation using Vento (`.vto`) templates
- Pages: `src/pages/index.vto` → login page; member pages are generated from the hooks
- Layout: `src/layouts/base.vto` — injects `window.hashes` and loads `src/scripts/main.ts`
- CSS: `src/styles/main.css` (imports reset, global, and component stylesheets)

### Data flow

1. **Source of truth**: Google Sheets (member roster + seminar/taikai history)
2. **`yarn generate:info`** (`cli-scripts/fetch-member-info.ts`): Reads both spreadsheets via the Google Sheets API and writes one YAML file per member to `src/data/members/{id}.yml`
3. **`src/hooks/members.ts`**: At build time, reads all YAML files from `src/data/members/` and returns typed `Member[]`, computing `currentRank` from rank history
4. **`src/hooks/hashes.ts`**: At build time, maps each member ID → cyrb53 hash of their sanitized `firstName + lastName`; this map is embedded in the HTML as `window.hashes`

### Authentication

- **Login by ID**: checks `window.hashes[id]` exists; stores the hash value in `sessionStorage`
- **Login by name**: sanitizes input (lowercase, letters only via `src/scripts/sanitize.ts`), hashes it, finds matching ID in `window.hashes`
- **Member page auth**: compares `sessionStorage.auth` against `window.hashes[pageId]`
- No server, no real secrets — security relies on the hash being hard to reverse

### Key files

| Path | Purpose |
|------|---------|
| `utils/types.ts` | Shared TypeScript types (`Member`, `Rank`, `Seminar`, `Taikai`, etc.) |
| `utils/date.ts` | `parseFuzzyDate` / `formatFuzzyDate` — handles YAML dates that may be YYYY, YYYY-MM, or YYYY-MM-DD |
| `src/scripts/hash.ts` | cyrb53 hash function (used both at build time and client-side) |
| `src/scripts/sanitize.ts` | Name normalization for matching |
| `src/hooks/dojos.ts` | Static map of dojo names → URLs |
| `src/data/members/*.yml` | One file per member; **do not edit manually** — regenerate with `generate:info` |

### Testing

Tests live in `utils/*.test.ts`. Vitest is configured with `globals: true`, so `describe`/`it`/`expect` are available without imports. Test data is in `utils/nelson-testdata.yml`.
