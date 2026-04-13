# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start Astro dev server
yarn build        # Production build (outputs to dist/)
yarn preview      # Preview production build
yarn lint         # Run oxlint with auto-fix
yarn format       # Run oxfmt + prettier for .astro files
yarn format:check # Check formatting without writing
yarn typecheck    # Run tsc --noEmit
yarn test         # Run vitest (watch mode)
yarn test --run   # Run tests once
yarn test <file>  # Run a single test file

# Data management
yarn clean:members       # Delete all src/members/*.yml files
yarn generate:info       # Fetch member data from Google Sheets and regenerate yml files
```

`generate:info` requires a `.env` file with `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.

## Architecture

This is a member portal for the US Federation of Battodo (a Japanese sword art). The key design constraint is **client-side authentication without a backend**: member data is embedded in the built HTML, and login works by hashing a member's name (using cyrb53) and comparing it against a `window.hashes` map injected into every page.

### Build pipeline

- **Astro** (static site generation, `output: 'static'`)
- Pages: `src/pages/index.astro` → login page; `src/pages/member/[id].astro` → one page per member via `getStaticPaths()`
- Layout: `src/layouts/Layout.astro` — injects `window.hashes` via a `data-hashes` attribute on `<body>` and loads `src/scripts/main.ts`
- CSS: per-page stylesheets imported in the Astro frontmatter (`src/styles/index.css`, `src/styles/member.css`); shared base styles in `src/styles/reset.css` and `src/styles/global.css`

### Data flow

1. **Source of truth**: Google Sheets (member roster + seminar/taikai history)
2. **`yarn generate:info`** (`cli-scripts/fetch-member-info.ts`): Reads both spreadsheets via the Google Sheets API and writes one YAML file per member to `src/members/{id}.yml`
3. **`src/loaders/members.ts`**: At build time, reads all YAML files from `src/members/` and returns typed `Member[]`, computing `currentRank` from rank history
4. **`src/loaders/hashes.ts`**: At build time, maps each member ID → cyrb53 hash of their sanitized `firstName + lastName`; this map is serialized to JSON and stored in `document.body.dataset.hashes`, then read into `window.hashes` by an inline script

### Authentication

- **Login by ID**: checks `window.hashes[id]` exists; stores the hash value in `sessionStorage`
- **Login by name**: sanitizes input (lowercase, letters only via `src/utils/sanitize.ts`), hashes it, finds matching ID in `window.hashes`
- **Member page auth**: compares `sessionStorage.auth` against `window.hashes[pageId]`
- No server, no real secrets — security relies on the hash being hard to reverse

### Key files

| Path                               | Purpose                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/loaders/members.ts`           | Reads YAML files, returns typed `Member[]`, computes `currentRank` from rank history          |
| `src/loaders/hashes.ts`            | Maps member ID → cyrb53 hash of sanitized name; used by the layout                            |
| `src/loaders/dojos.ts`             | Static map of dojo names → URLs                                                               |
| `src/utils/fuzzy-dates.ts`         | `parseFuzzyDate` / `formatFuzzyDate` — handles dates that may be YYYY, YYYY-MM, or YYYY-MM-DD |
| `src/utils/hash.ts`                | cyrb53 hash function (used both at build time and client-side)                                |
| `src/utils/sanitize.ts`            | Name normalization for login matching                                                         |
| `src/utils/testing-eligibility.ts` | Determines if a member is eligible to test for next rank                                      |
| `src/utils/jp-rank.ts`             | Maps rank names to Japanese kanji                                                             |
| `src/utils/format-taikai.ts`       | Formats taikai win records for display                                                        |
| `src/scripts/main.ts`              | Client-side JS: login/logout logic, auth checks                                               |
| `src/members/*.yml`                | One file per member; **do not edit manually** — regenerate with `generate:info`               |

### Testing

Tests live in `src/**/*.test.ts`. Vitest is configured with `globals: true`, so `describe`/`it`/`expect` are available without imports. Test data is in `src/utils/nelson-testdata.yml`.
