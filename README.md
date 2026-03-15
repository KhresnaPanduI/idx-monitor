# IDX Holder Monitor

Static-first research app for exploring KSEI ownership disclosure snapshots from normalized CSV files.

The project turns a monthly `*_normalized.csv` file into app-ready JSON artifacts, then serves a searchable website for:

- looking up issuers by stock code or issuer name
- looking up investors by name
- scanning disclosed holders in table form
- following issuer-investor relationships through a bounded multi-hop network

The current graph implementation is `2D only` by design. It is deterministic, easier to read than the earlier 3D version, and better suited to ownership research where label clarity matters more than spatial depth.

## Why this exists

In the Indonesian market, public ownership disclosure is useful because it surfaces:

- insider/director/stakeholder ownership
- holders above the regulatory disclosure threshold

With the threshold moving from `5%` to `1%`, the monthly file becomes much more useful for retail research. This app exists to make that file searchable and navigable without manually opening a giant CSV and using `Ctrl+F`.

## Product model

The app is built around one core idea:

- one row in the normalized CSV = one `issuer x investor` disclosed holding in a specific monthly snapshot

What the app shows:

- issuer pages with holder tables and known disclosed ownership
- investor pages with all visible positions in a snapshot
- a bounded relationship graph between issuers and investors

What the app does not assume:

- disclosed rows sum to `100%`
- the file is a complete cap table

If the disclosed percentage sum is below `100%`, the remainder is treated as estimated public / sub-threshold ownership.

## Tech stack

- `Next.js` App Router
- `React` + `TypeScript`
- `Tailwind CSS`
- `TanStack Table`
- `Python` preprocessing for snapshot artifact generation
- static JSON artifacts under `public/generated`
- no runtime database
- deploy-friendly for Vercel

## High-level architecture

There are two separate layers:

1. Build-time data pipeline
2. Runtime web app

### 1. Build-time data pipeline

Input:

- root-level normalized CSV files matching `*_normalized.csv`

Main script:

- `scripts/build_snapshot_artifacts.py`

Output:

- `public/generated/manifest.json`
- `public/generated/snapshots/<snapshotId>/data.json`
- `public/generated/snapshots/<snapshotId>/search-index.json`
- `public/generated/snapshots/<snapshotId>/graph.json`

The script:

- reads normalized CSV rows with Python `csv.DictReader`
- cleans noisy text fields
- expands investor type and local/foreign labels
- computes issuer and investor summaries
- builds a search index
- builds graph adjacency data
- emits warning strings for anomalies

Important:

- `public/generated` is generated output and is ignored by git
- do not edit generated JSON by hand
- regenerate it through the Python build step instead

### 2. Runtime web app

The Next.js app reads the generated JSON files from disk using server helpers in `lib/data.ts`, and the client-side components fetch the graph/search artifacts from `/generated/...`.

This means:

- there is no live API layer
- there is no database
- the site is mostly a static artifact browser over precomputed JSON

## Request flow

### Home page

- route: `/`
- file: `app/page.tsx`

Responsibilities:

- show latest snapshot metrics
- show featured issuers
- render the search-first entry point

### Issuer page

- route: `/snapshots/[snapshotId]/issuers/[shareCode]`
- file: `app/snapshots/[snapshotId]/issuers/[shareCode]/page.tsx`

Responsibilities:

- load issuer summary and holding rows
- calculate page-level metrics from generated data
- render:
  - issuer header
  - metrics
  - graph panel
  - holder table

### Investor page

- route: `/snapshots/[snapshotId]/investors/[investorId]`
- file: `app/snapshots/[snapshotId]/investors/[investorId]/page.tsx`

Responsibilities:

- load investor summary and visible positions
- render:
  - investor header
  - metrics
  - graph panel
  - investor positions table

## Data model

Shared types live in `lib/types.ts`.

Important top-level runtime types:

- `SnapshotData`
- `SearchIndex`
- `GraphData`

Important graph types:

- `GraphNode`
- `GraphEdge`
- `ExpandedGraph`

Important row type:

- `HoldingRow`

The canonical row fields in the app are:

- `snapshotDate`
- `shareCode`
- `issuerName`
- `investorName`
- `investorId`
- `investorTypeCode`
- `investorTypeLabel`
- `localForeignCode`
- `localForeignLabel`
- `nationality`
- `domicile`
- `holdingsScripless`
- `holdingsScrip`
- `totalHoldingShares`
- `percentage`

## Core files to know

### App routes

- `app/page.tsx`
- `app/snapshots/[snapshotId]/issuers/[shareCode]/page.tsx`
- `app/snapshots/[snapshotId]/investors/[investorId]/page.tsx`

### Data access

- `lib/data.ts`

Reads generated JSON from `public/generated`.

### Search logic

- `components/search-panel.tsx`
- `lib/search.ts`

`search-panel.tsx` fetches the search artifact.
`lib/search.ts` scores exact match, prefix match, substring match, then loose sequential-character match.

### Graph logic

- `components/graph-panel.tsx`
- `components/network-graph-2d.tsx`
- `lib/graph.ts`

Responsibilities split:

- `lib/graph.ts`
  - graph expansion only
  - applies filters
  - enforces hop limits and edge limits
- `components/graph-panel.tsx`
  - graph controls
  - filter state
  - deterministic ring layout coordinates
  - graph summary sidebar
- `components/network-graph-2d.tsx`
  - pure 2D rendering
  - SVG output
  - outside-label placement
  - simple left/right collision handling for labels

### Tables

- `components/holder-table.tsx`
- `components/investor-positions-table.tsx`

Both are table-first analysis surfaces built with `TanStack Table`.

### Formatting helpers

- `lib/format.ts`

### Preprocessing pipeline

- `scripts/build_snapshot_artifacts.py`

## How the graph works

The graph is not force-directed anymore.

It is deterministic:

- center node = current issuer or investor
- hop 1 = first ring
- hop 2 = second ring
- hop 3 = third ring
- hop 4 = fourth ring

This was chosen intentionally because deterministic 2D layout is easier to scan and more stable than 3D fitting for this use case.

Graph behavior:

- node click recenters the graph
- graph expansion is bounded
- filters are applied before expansion
- labels are placed outside nodes
- long labels are truncated visually, with full text in `<title>` tooltips

If you want to change graph behavior, check these places first:

- traversal/filter rules: `lib/graph.ts`
- ring radius and node size: `components/graph-panel.tsx`
- label placement and collision handling: `components/network-graph-2d.tsx`

## Data pipeline details

`scripts/build_snapshot_artifacts.py` expects root-level files matching:

- `*_normalized.csv`

It intentionally skips:

- `*_normalized_id.csv`

It also ignores the PDF extractor path at runtime. The web app does not use:

- `extract_ksei_pdf_to_csv.py`

That script is part of the source extraction workflow, not the website runtime.

### Cleaning rules currently handled in preprocessing

- investor type code -> full label
- local/foreign code -> full label
- geography cleanup for obvious OCR/normalization artifacts
- issuer-name canonicalization per `shareCode`
- holdings mismatch warnings when:
  - `holdingsScripless + holdingsScrip != totalHoldingShares`

### Artifact outputs per snapshot

`data.json`

- issuer summaries
- investor summaries
- issuer holding rows
- investor positions
- warnings

`search-index.json`

- issuer search entries
- investor search entries

`graph.json`

- graph node metadata
- adjacency lists
- graph settings like:
  - default hop limit
  - max hop limit
  - max nodes
  - max edges

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build generated artifacts and production app:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Notes:

- `npm run build` runs `python scripts/build_snapshot_artifacts.py` first
- if there is no `*_normalized.csv` file in the repo root, the build step will fail
- on some Windows/sandboxed environments, `npm test` or `npm run build` may need to run outside restricted sandboxes because `esbuild` can hit `spawn EPERM`

## Adding a new monthly snapshot

1. Put the new normalized CSV in the repo root.
2. Make sure the filename matches `*_normalized.csv`.
3. Run:

```bash
npm run build
```

4. Verify:
   - `public/generated/manifest.json` contains the new snapshot
   - the home page uses the expected latest snapshot
   - issuer and investor pages load correctly
   - warnings look reasonable

You do not need to add a new route or schema for each month. The app is snapshot-aware already.

## Common change guide

### If you want to change search ranking

Start here:

- `lib/search.ts`

### If you want to change issuer or investor page layout

Start here:

- `app/snapshots/[snapshotId]/issuers/[shareCode]/page.tsx`
- `app/snapshots/[snapshotId]/investors/[investorId]/page.tsx`

### If you want to change graph filters or defaults

Start here:

- `components/graph-panel.tsx`
- `scripts/build_snapshot_artifacts.py`

Be aware:

- runtime defaults in `GraphPanel` and generated defaults in `graph.json` should stay aligned

### If you want to change graph expansion rules

Start here:

- `lib/graph.ts`

### If you want to change graph visual layout

Start here:

- `components/graph-panel.tsx`
- `components/network-graph-2d.tsx`

### If you want to change investor type labels

Start here:

- `scripts/build_snapshot_artifacts.py`
- table and graph filter labels in:
  - `components/graph-panel.tsx`
  - `components/holder-table.tsx`
  - `components/investor-positions-table.tsx`

### If you want to change preprocessing or data cleaning

Start here:

- `scripts/build_snapshot_artifacts.py`

## Testing

Current tests are small and focused:

- `tests/search.test.ts`
- `tests/graph.test.ts`

They currently cover:

- search behavior
- multi-hop expansion without duplicate edges

They do not fully cover:

- UI rendering
- preprocessing edge cases
- SVG layout collisions

If you change preprocessing, graph traversal, or search ranking, add or update tests.

## Known limitations

- No user accounts, alerts, or watchlists yet
- Snapshot selector UI is not exposed yet even though the pipeline supports multiple snapshots
- Label collision handling in the 2D graph is intentionally simple, not a full layout engine
- The app depends on the normalized CSV being structurally valid
- The PDF extraction script is not integrated into the app build; extraction and normalization still happen before the website pipeline

## For AI agents and future contributors

Use this mental model first:

1. The website is a static viewer over generated JSON artifacts.
2. The source of truth is the normalized CSV, not the generated JSON.
3. If the data looks wrong, inspect `scripts/build_snapshot_artifacts.py` before changing UI code.
4. If the graph looks wrong, separate:
   - expansion logic in `lib/graph.ts`
   - layout generation in `components/graph-panel.tsx`
   - SVG rendering and label placement in `components/network-graph-2d.tsx`
5. Do not hand-edit `public/generated`.

Good first inspection order for most bugs:

1. `lib/types.ts`
2. `scripts/build_snapshot_artifacts.py`
3. `lib/data.ts`
4. the route page
5. the specific UI component

When making changes:

- prefer updating generated-data logic if the problem is semantic
- prefer updating UI components if the problem is presentational
- keep graph traversal logic separate from graph rendering logic
- preserve the table-first workflow; the graph is an exploration aid, not the primary source of truth

## Repository hygiene

Ignored/generated directories:

- `.next`
- `node_modules`
- `coverage`
- `public/generated`

There are also local raw/source files that may exist in a developer workspace but are intentionally not part of the app runtime contract, such as:

- PDFs
- intermediary CSVs
- extraction helpers
- local vendor folders

## Suggested next improvements

- expose a snapshot selector in the UI
- add month-over-month change detection
- improve label collision handling in dense 2D graphs
- add stronger preprocessing validation tests
- add issuer compare and investor compare views
