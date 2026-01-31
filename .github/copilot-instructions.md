# AI Agent Instructions for MTG Collection Tracker

## Project Overview
Multi-universe collectible card tracker for Magic: The Gathering custom sets (Avatar: The Last Airbender, Final Fantasy, Lorwyn Eclipsed). React + TypeScript + Vite SPA with Firebase backend for authentication and data persistence.

## Architecture

### State Management Pattern
**Two-tier React Context system** - do NOT use Redux or other state libraries:
1. **AuthContext** (`components/AuthContext.tsx`) - Firebase Authentication, user session
2. **CollectionContext** (`components/CollectionContext.tsx`) - Universe switching, card collection state, deck management, navigation state

All state flows through these contexts. Components consume via `useAuth()` and `useCollection()` hooks.

### Universe System (Critical Concept)
The app supports **multiple "universes"** (ATLA, Final Fantasy, Lorwyn). Key files:
- `constants.tsx`: `UNIVERSES` object defines each universe's sets, branding, icons
- `types.ts`: `UniverseType = 'atla' | 'ff' | 'ecl'`

**Universe switching resets everything**: Different card pools, separate collections per user per universe. CollectionContext effect at line ~114 handles this orchestration.

### Data Flow
```
Scryfall API → dataService.fetchAllCards() → CollectionContext.cards state
User interactions → CollectionContext.updateCardQuantity() → Firestore (if authenticated) OR localStorage (guest)
```

**Dual storage strategy**:
- **Authenticated users**: Real-time Firestore sync with `onSnapshot` listener (CollectionContext line ~130)
- **Guest users**: localStorage fallback with key pattern `${universe}_collection_guest`

### Firebase Integration
- **Config**: `firebase.config.ts` reads from `.env.local` (VITE_ prefixed vars)
- **Auth**: Email/password only, displayName synced to Firestore `users/{uid}` collection
- **Data**: Collections stored as `collections/{userId}_{universe}` documents
- **Security**: Firestore rules (in `FIREBASE_SETUP.md`) enforce per-user access

## Component Architecture

### View Components (Pages)
All consume both contexts via hooks:
- `LibraryView.tsx` - Card browsing with filters (binder mode toggle)
- `DecksView.tsx` - Pre-constructed Jumpstart decks
- `DeckBuilder.tsx` - Custom deck creation
- `StatsDashboard.tsx` - Collection analytics
- `RulesView.tsx` - Static game rules

Navigation state lives in CollectionContext (`activeView` + `setActiveView`), NOT React Router.

### Shared Components
- `ManaCost.tsx` - Parses `{W}{U}` mana strings, renders SVG symbols from `MANA_SYMBOLS` constant
- `CardModal.tsx` - Full card details with quantity controls
- `AuthModal.tsx` - Login/signup form with Firebase calls

### Global Preview System
CollectionContext manages card hover previews:
- `previewCard` + `previewImage` state
- `useCardHover()` hook provides 2-second delayed preview
- `CardPreviewOverlay` component in App.tsx renders the preview

## Development Commands

```bash
npm run dev          # Vite dev server on localhost:3000 (not 5173!)
npm run build        # Production build
npm run preview      # Preview production build
```

**No test suite exists** - manual testing only.

## Data Structures

### Collection State Shape
```typescript
{
  cards: { [cardId: string]: quantity },        // Regular cards
  foilCards: { [cardId: string]: quantity },    // Foil variants
  decks: { [deckTitle: string]: boolean },      // Precon ownership
  customDecks: CustomDeck[]                      // User-built decks
}
```

### Card Object (from Scryfall)
Uses Scryfall's full schema. Key fields: `id`, `name`, `set`, `collector_number`, `image_uris`, `card_faces` (for DFCs), `prices.usd`, `prices.usd_foil`.

### Deck Data Sources
- **Jumpstart**: Loaded from `jscomplete.json` (flat CSV-like structure)
- **Beginner Box**: Hardcoded in `constants.tsx` as `BEGINNER_DECKS`
- Both hydrated with flavor text from `DECK_SUMMARIES`

## Key Patterns & Conventions

### Scryfall API Usage
**Always respect rate limits** - 100ms delay between paginated requests (see `dataService.ts:47`).

Query pattern: `(set:tla OR set:ptla OR ...)` with `unique=prints` to get all printings.

### Card Identification
**Always use Scryfall ID** (`card.id`), not card name. Names can be duplicated across sets. DFCs have `card_faces` array - handle front/back separately.

### Styling
Tailwind CSS with custom `text-primary` color. Universe configs include `themeColor` for branded accents. NO CSS modules or styled-components.

### Icon System
- Font Awesome 6 (`fa-solid`, `fa-regular`) for UI icons
- SVG paths for universe logos (see `UNIVERSES.atla.icon` with custom viewBox)
- Mana symbols fetched from `svgs.scryfall.io`

### State Updates
Use functional setState for nested objects:
```typescript
setCollection(prev => ({ ...prev, cards: { ...prev.cards, [id]: qty } }))
```

Never mutate state directly. All collection changes trigger Firestore saves (debounced 1 second).

## Common Tasks

### Adding a New Universe
1. Define set list in `constants.tsx` (e.g., `MY_SETS`)
2. Add to `UNIVERSES` object with logo, icon, theme color
3. Update `UniverseType` in `types.ts`
4. Update universe name display logic in `App.tsx` (line ~226)

### Adding a New View
1. Create component in `components/`
2. Add to `ViewState` type in `types.ts`
3. Add navigation item to `NAV_ITEMS` in `App.tsx`
4. Add route case in `Content` component render

### Modifying Filters
All filter state in CollectionContext as `libraryFilters: LibraryFilters`. Filter UI lives in `LibraryView.tsx`. Reset function: `resetLibraryFilters()`.

## Known Gotchas

1. **Environment variables**: Must prefix with `VITE_` (Vite requirement). Restart dev server after `.env.local` changes.

2. **Firebase persistence**: Firestore listener established on mount - may see stale data if rules are wrong. Check browser console for `onSnapshot` errors.

3. **Guest to authenticated migration**: No automatic data migration. Users lose guest data when signing up. Could add export/import flow.

4. **Double-faced cards**: `card.card_faces` array has separate `image_uris`. Use `card.image_uris` if available, else `card.card_faces[0].image_uris`.

5. **Set codes**: Scryfall returns lowercase (`tla`), but some code assumes uppercase. Always normalize with `.toLowerCase()` (see `dataService.ts:30`).

6. **Universe switching**: CollectionContext unmounts/remounts Firestore listeners. Can cause double-fetches. Cleanup via `return () => unsubscribe()` is critical.

## File Organization

```
components/          React components (views + shared)
services/            External API integration (Scryfall)
types.ts            TypeScript interfaces
constants.tsx       Static data (universes, decks, mana symbols)
firebase.config.ts  Firebase initialization
App.tsx             Root component, navigation shell
```

## References

- Scryfall API docs: https://scryfall.com/docs/api
- Firebase Auth: https://firebase.google.com/docs/auth/web/start
- Firestore queries: https://firebase.google.com/docs/firestore/query-data/queries
- Tailwind CSS: https://tailwindcss.com/docs (v3.x via CDN in `index.html`)
