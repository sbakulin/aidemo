# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Greek-Russian flashcard app using spaced repetition with swipe gestures. Built with Create React App, backed by Supabase (PostgreSQL).

## Commands

- `npm start` — dev server on localhost:3000
- `npm run build` — production build (output to `build/`)
- `npm test` — run tests (Jest via react-scripts, interactive by default; use `CI=true npm test` for single run)

## Architecture

**React 18 SPA** deployed on Netlify with SPA redirect (`/*` → `/index.html`).

### Routing (React Router v7)

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `Flashcard` | Main study mode — swipe cards right (remembered) or left (forgot) |
| `/verbs` | `VerbStudy` | Verb conjugation study mode |
| `/settings` | `Settings` | Language direction toggle, verb visibility |
| `/admin` | `Admin` | Phrase CRUD, stats reset, bulk management |

### State Management

Two React contexts wrap the app in `App.js`:

- **`SettingsContext`** — language direction (`greek-to-russian` / `russian-to-greek`), persisted to `localStorage`
- **`VerbsContext`** — verb list fetched from Supabase `Verbs` table, provides visibility toggling

### Database (Supabase)

Three tables — schema in `database_schema.sql`:

- **`Greek`** — vocabulary flashcards with spaced-repetition stats (correct/wrong counts, last shown)
- **`Verbs`** — base verbs with visibility flag (`IsVisible`) controlling which appear in study mode
- **`VerbPhrases`** — conjugation phrases linked to verbs via `VerbId` FK (cascade delete)

All DB access goes through `src/supabaseClient.js` which reads `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` from environment variables.

### Card Selection Algorithm

Cards are scored and shown by priority: new phrases (+500) > wrong answers (up to +300) > stale cards (up to +200) > never-correct (+150) > marked not-remembered (+100), plus a small random factor.

## Key Dependencies

- `framer-motion` — swipe gesture handling and card animations
- `@supabase/supabase-js` — database client
- `xlsx` — Excel import/export in admin
