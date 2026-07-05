# Lap Track

Lap Track is migrating from a single-file vanilla JavaScript app to a modular React + TypeScript architecture.

This repository now contains:

- A new Vite + React + TypeScript app (primary implementation target)
- Redux Toolkit store and typed domain slices for meet/race/runner/result modules
- Tailwind CSS v4 + shadcn/ui component foundation
- Legacy app files preserved for parity checks during migration

## Current Migration Status

Phase started:

- Vite + TypeScript scaffold complete
- shadcn/ui initialized
- Initial domain types and feature slices created
- App shell and tab framework in place

Phase in progress:

- Port legacy timer and results behaviors into typed feature modules
- Rebuild each tab flow with feature parity before adding collaboration features

## Folder Guide

- src/app: app-wide providers, typed hooks, and store setup
- src/features: feature slices and UI modules (runners, races, meets, results, layout)
- src/shared: shared types and utilities
- src/components/ui: shadcn/ui components
- legacy: preserved pre-migration app (reference only)

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Notes

- The source of truth during migration is the new TypeScript app in src.
- The legacy folder is retained to verify behavior while each feature is ported.
- Collaboration and social features are planned after feature parity milestone completion.
