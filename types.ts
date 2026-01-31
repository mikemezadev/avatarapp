
export interface CardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  artist?: string;
  flavor_text?: string;
}

export interface Card {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  flavor_text?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: CardFace[];
  prices?: {
    usd: string | null;
    usd_foil: string | null;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
  legalities?: Record<string, string>;
  scryfall_uri?: string;
}

export interface DeckCardEntry {
  name: string;
  qty: number;
  set?: string;
  collectorNumber?: string;
}

export interface Deck {
  title: string;
  source: 'Jumpstart Boosters' | 'Beginner Box';
  cards: DeckCardEntry[];
  themeCard?: string; // The face card
  strategy?: string;
  strengths?: string;
  weaknesses?: string;
  pairings?: string[];
  summary?: string;
}

export interface CustomDeck {
  id: string;
  name: string;
  cards: Record<string, number>; // Card ID -> Quantity
  createdAt: number;
  updatedAt: number;
  description?: string; // AI generated or user edited
  commanderId?: string;
  coverCardId?: string; // Specific card chosen for the deck banner
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export type ViewState = 'library' | 'jumpstart' | 'builder' | 'dashboard' | 'rules';

export type UniverseType = 'atla' | 'ff' | 'ecl';

export interface LibraryFilters {
  search: string;
  rarity: string;
  set: string;
  types: string[];
  cmc: string;
  colors: string[];
  ownershipStatus: 'all' | 'owned' | 'missing';
  sort: 'collector_number' | 'name' | 'cmc' | 'price';
  order: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

export interface CollectionState {
  // Map of Card ID -> Quantity Owned (Regular)
  cards: Record<string, number>;
  // Map of Card ID -> Quantity Owned (Foil)
  foilCards: Record<string, number>;
  // Map of Deck Title -> Boolean (Collected/Not Collected)
  decks: Record<string, boolean>;
  // List of user created decks
  customDecks: CustomDeck[];
}
