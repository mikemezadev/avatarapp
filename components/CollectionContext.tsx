
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Card, Deck, CollectionState, CustomDeck, ViewState, LibraryFilters, UniverseType } from '../types';
import { fetchAllCards, fetchDecks } from '../services/dataService';
import { useAuth } from './AuthContext';
import { UNIVERSES } from '../constants';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.config';

export const DEFAULT_FILTERS: LibraryFilters = {
  search: '',
  rarity: '',
  set: '',
  types: [],
  cmc: '',
  colors: [],
  ownershipStatus: 'all',
  sort: 'collector_number',
  order: 'asc',
  minPrice: undefined,
  maxPrice: undefined
};

interface CollectionContextType {
  cards: Card[];
  decks: Deck[];
  collection: CollectionState;
  loading: boolean;
  updateCardQuantity: (cardId: string, delta: number, isFoil?: boolean) => void;
  importCollection: (items: { id: string, qty: number, isFoil: boolean }[]) => void;
  toggleDeckCollected: (deckTitle: string) => void;
  saveCustomDeck: (deck: CustomDeck) => void;
  deleteCustomDeck: (deckId: string) => void;
  totalValue: number;
  // Navigation State
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  focusedDeck: string | null;
  setFocusedDeck: (deckTitle: string | null) => void;
  // Library State
  libraryFilters: LibraryFilters;
  setLibraryFilters: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  resetLibraryFilters: () => void;
  isBinderMode: boolean;
  setIsBinderMode: (isBinderMode: boolean) => void;
  // Global Preview
  previewCard: Card | null;
  setPreviewCard: (card: Card | null) => void;
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  // Universe State
  activeUniverse: UniverseType | null;
  switchUniverse: (universe: UniverseType | null) => void;
  universeConfig: typeof UNIVERSES.atla | typeof UNIVERSES.ff | typeof UNIVERSES.ecl | null;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

const EMPTY_COLLECTION: CollectionState = {
  cards: {},
  foilCards: {},
  decks: {},
  customDecks: []
};

export const CollectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Universe State
  const [activeUniverse, setActiveUniverse] = useState<UniverseType | null>(null);
  
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Navigation State
  const [activeView, setActiveView] = useState<ViewState>('library');
  const [focusedDeck, setFocusedDeck] = useState<string | null>(null);
  
  // Preview State
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Library Filters State
  const [libraryFilters, setLibraryFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [isBinderMode, setIsBinderMode] = useState(false);

  // State to hold the user's data
  const [collection, setCollection] = useState<CollectionState>(EMPTY_COLLECTION);

  // 1. Data Fetching when Universe Changes
  useEffect(() => {
    if (!activeUniverse) {
        setCards([]);
        setDecks([]);
        return;
    }

    const initData = async () => {
      setLoading(true);
      try {
        const universeConfig = UNIVERSES[activeUniverse];
        // Fetch cards for the specific universe
        const [loadedCards, loadedDecks] = await Promise.all([
          fetchAllCards(universeConfig.sets),
          fetchDecks(universeConfig.hasJumpstart)
        ]);
        setCards(loadedCards);
        setDecks(loadedDecks);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeUniverse]);

  // 2. Load User Collection (Universe + User specific) with Firebase sync
  useEffect(() => {
    if (!activeUniverse) {
        setCollection(EMPTY_COLLECTION);
        return;
    }

    const userId = user ? user.id : 'guest';
    
    // For guest users, use localStorage
    if (userId === 'guest') {
      const storageKey = `${activeUniverse}_collection_guest`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCollection({ 
              cards: parsed.cards || {}, 
              foilCards: parsed.foilCards || {},
              decks: parsed.decks || {}, 
              customDecks: parsed.customDecks || [] 
          });
        } catch (e) {
          console.error("Error parsing collection", e);
          setCollection(EMPTY_COLLECTION);
        }
      } else {
        setCollection(EMPTY_COLLECTION);
      }
      
      setLibraryFilters(DEFAULT_FILTERS);
      setActiveView('library');
      setIsBinderMode(false);
      return;
    }

    // For authenticated users, sync with Firestore
    const collectionDocRef = doc(db, 'collections', `${userId}_${activeUniverse}`);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(collectionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCollection({
          cards: data.cards || {},
          foilCards: data.foilCards || {},
          decks: data.decks || {},
          customDecks: data.customDecks || []
        });
      } else {
        // Initialize empty collection
        setCollection(EMPTY_COLLECTION);
      }
    }, (error) => {
      console.error("Error loading collection from Firestore:", error);
      setCollection(EMPTY_COLLECTION);
    });
    
    // Reset filters when switching
    setLibraryFilters(DEFAULT_FILTERS);
    setActiveView('library');
    setIsBinderMode(false);

    // Cleanup listener on unmount or when dependencies change
    return () => unsubscribe();
  }, [user, activeUniverse]);

  // 3. Save Collection when it changes (to Firestore for authenticated users)
  useEffect(() => {
    if (!activeUniverse || loading) return;
    
    const userId = user ? user.id : 'guest';
    
    // For guest users, use localStorage
    if (userId === 'guest') {
      const storageKey = `${activeUniverse}_collection_guest`;
      localStorage.setItem(storageKey, JSON.stringify(collection));
      return;
    }

    // For authenticated users, save to Firestore
    const collectionDocRef = doc(db, 'collections', `${userId}_${activeUniverse}`);
    
    // Debounced save to Firestore
    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(collectionDocRef, {
          ...collection,
          lastUpdated: Date.now()
        });
      } catch (error) {
        console.error("Error saving collection to Firestore:", error);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [collection, user, loading, activeUniverse]);

  const updateCardQuantity = (cardId: string, delta: number, isFoil: boolean = false) => {
    setCollection(prev => {
      const targetMap = isFoil ? prev.foilCards : prev.cards;
      const current = targetMap[cardId] || 0;
      const newValue = Math.max(0, current + delta);
      
      const newMap = { ...targetMap };
      if (newValue === 0) {
        delete newMap[cardId];
      } else {
        newMap[cardId] = newValue;
      }
      
      if (isFoil) {
          return { ...prev, foilCards: newMap };
      } else {
          return { ...prev, cards: newMap };
      }
    });
  };

  const importCollection = (items: { id: string, qty: number, isFoil: boolean }[]) => {
      setCollection(prev => {
          const newCards = { ...prev.cards };
          const newFoilCards = { ...prev.foilCards };

          items.forEach(item => {
              const targetMap = item.isFoil ? newFoilCards : newCards;
              // Additive import
              targetMap[item.id] = (targetMap[item.id] || 0) + item.qty;
          });

          return { ...prev, cards: newCards, foilCards: newFoilCards };
      });
  };

  const toggleDeckCollected = (deckTitle: string) => {
    setCollection(prev => {
      const isCollected = prev.decks[deckTitle];
      const newDecks = { ...prev.decks };
      if (isCollected) {
        delete newDecks[deckTitle];
      } else {
        newDecks[deckTitle] = true;
      }
      return { ...prev, decks: newDecks };
    });
  };

  const saveCustomDeck = (deck: CustomDeck) => {
      setCollection(prev => {
          const existingIndex = prev.customDecks.findIndex(d => d.id === deck.id);
          const newCustomDecks = [...prev.customDecks];
          
          if (existingIndex >= 0) {
              newCustomDecks[existingIndex] = { ...deck, updatedAt: Date.now() };
          } else {
              newCustomDecks.push({ ...deck, createdAt: Date.now(), updatedAt: Date.now() });
          }
          
          return { ...prev, customDecks: newCustomDecks };
      });
  };

  const deleteCustomDeck = (deckId: string) => {
      setCollection(prev => ({
          ...prev,
          customDecks: prev.customDecks.filter(d => d.id !== deckId)
      }));
  };

  const resetLibraryFilters = () => {
    setLibraryFilters(DEFAULT_FILTERS);
  };

  // Calculate total value based on collection (Regular + Foil)
  const totalValue = cards.reduce((sum, card) => {
    const regularQty = collection.cards[card.id] || 0;
    const foilQty = collection.foilCards[card.id] || 0;
    
    const regularPrice = parseFloat(card.prices?.usd || '0');
    const foilPrice = parseFloat(card.prices?.usd_foil || '0');
    
    return sum + (regularQty * regularPrice) + (foilQty * foilPrice);
  }, 0);

  return (
    <CollectionContext.Provider value={{
      cards,
      decks,
      collection,
      loading,
      updateCardQuantity,
      importCollection,
      toggleDeckCollected,
      saveCustomDeck,
      deleteCustomDeck,
      totalValue,
      activeView,
      setActiveView,
      focusedDeck,
      setFocusedDeck,
      libraryFilters,
      setLibraryFilters,
      resetLibraryFilters,
      isBinderMode,
      setIsBinderMode,
      previewCard,
      setPreviewCard,
      previewImage,
      setPreviewImage,
      activeUniverse,
      switchUniverse: setActiveUniverse,
      universeConfig: activeUniverse ? UNIVERSES[activeUniverse] : null
    }}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => {
  const context = useContext(CollectionContext);
  if (!context) throw new Error("useCollection must be used within CollectionProvider");
  return context;
};

// Helper hook for hover preview with delay
export const useCardHover = () => {
    const { setPreviewCard, setPreviewImage } = useCollection();
    const timerRef = useRef<number | null>(null);

    const onMouseEnter = (card: Card, specificImage?: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setPreviewCard(card);
            if (specificImage) {
                setPreviewImage(specificImage);
            } else {
                setPreviewImage(null);
            }
        }, 2000); // 2 second delay
    };

    const onMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPreviewCard(null);
        setPreviewImage(null);
    };

    return { onMouseEnter, onMouseLeave };
};
