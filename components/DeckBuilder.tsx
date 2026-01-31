
import React, { useState, useMemo } from 'react';
import { useCollection, useCardHover } from './CollectionContext';
import { Card, CustomDeck } from '../types';
import { ManaCost } from './ManaCost';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CardModal } from './CardModal';
import { MANA_SYMBOLS } from '../constants';

const FORMATS = [
    { id: 'standard', label: 'Standard' },
    { id: 'pioneer', label: 'Pioneer' },
    { id: 'modern', label: 'Modern' },
    { id: 'legacy', label: 'Legacy' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'commander', label: 'Commander' },
    { id: 'pauper', label: 'Pauper' },
    { id: 'brawl', label: 'Brawl' },
    { id: 'historic', label: 'Historic' },
    { id: 'timeless', label: 'Timeless' }
];

// Sets that contain non-playable cards (Tokens, Art Series, Front Cards)
const NON_PLAYABLE_SETS = ['ttla', 'atla', 'ttle', 'atle', 'ftla', 'jtla', 'tfin', 'afin', 'tfic'];

// Helper for generating IDs safely
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

interface StatsFilter {
    type: 'cmc' | 'cardType';
    value: string | number;
}

export const DeckBuilder: React.FC = () => {
  const { cards, collection, saveCustomDeck, deleteCustomDeck, universeConfig } = useCollection();
  const { onMouseEnter, onMouseLeave } = useCardHover();
  const [activeDeck, setActiveDeck] = useState<CustomDeck | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [statsFilter, setStatsFilter] = useState<StatsFilter | null>(null);
  const [copied, setCopied] = useState(false);

  // Deck List Filter State
  const [deckListSearch, setDeckListSearch] = useState('');
  const [deckListColors, setDeckListColors] = useState<string[]>([]);
  const [deckListFormat, setDeckListFormat] = useState<string>('');
  const [deckListType, setDeckListType] = useState<'all' | 'commander' | 'standard'>('all');

  // Import State
  const [isImportMode, setIsImportMode] = useState(false);
  const [importText, setImportText] = useState('');

  // --- Derived State & Hooks (Must be before any return statements) ---

  const cardMap = useMemo(() => {
      const map = new Map<string, Card>();
      cards.forEach(c => map.set(c.id, c));
      return map;
  }, [cards]);

  const filteredCustomDecks = useMemo(() => {
      return collection.customDecks.filter(deck => {
          // 1. Search
          if (deckListSearch && !deck.name.toLowerCase().includes(deckListSearch.toLowerCase())) return false;
          
          // 2. Type (Commander vs Regular)
          if (deckListType === 'commander' && !deck.commanderId) return false;
          if (deckListType === 'standard' && deck.commanderId) return false;

          // Resolve Cards
          const deckCards: Card[] = [];
          Object.keys(deck.cards).forEach(id => {
              const c = cardMap.get(id);
              if (c) deckCards.push(c);
          });

          // 3. Colors
          if (deckListColors.length > 0) {
               const deckIdentity = new Set<string>();
               deckCards.forEach(c => c.colors?.forEach(col => deckIdentity.add(col)));
               
               if (deckListColors.includes('C')) {
                    // Colorless filter: Deck must have NO colors
                    if (deckIdentity.size > 0) return false;
               } else {
                    // Colored filter: Must have ALL selected colors (subset check)
                    const hasAll = deckListColors.every(c => deckIdentity.has(c));
                    if (!hasAll) return false;
               }
          }

          // 4. Legality
          if (deckListFormat) {
              const isLegal = deckCards.every(c => {
                  const l = c.legalities?.[deckListFormat];
                  return l === 'legal' || l === 'restricted';
              });
              if (!isLegal) return false;
          }

          return true;
      });
  }, [collection.customDecks, cardMap, deckListSearch, deckListColors, deckListFormat, deckListType]);

  const deckCardList = useMemo(() => {
      if (!activeDeck) return [];
      return Object.entries(activeDeck.cards).map(([id, qty]) => {
          const card = cards.find(c => c.id === id);
          return { card, qty };
      }).filter((item): item is { card: Card, qty: number } => !!item.card);
  }, [activeDeck, cards]);

  const deckLegality = useMemo(() => {
    const status: Record<string, boolean> = {};
    if (deckCardList.length === 0) {
        FORMATS.forEach(f => status[f.id] = true); // Empty deck is technically legal or neutral, let's show green
        return status;
    }

    FORMATS.forEach(fmt => {
        const allLegal = deckCardList.every(({ card }) => {
            const l = card.legalities?.[fmt.id];
            return l === 'legal' || l === 'restricted';
        });
        status[fmt.id] = allLegal;
    });
    return status;
  }, [deckCardList]);

  const filteredDeckList = useMemo(() => {
      let list = deckCardList;
      // Apply Stats Filter
      if (statsFilter) {
          list = list.filter(({ card }) => {
              if (statsFilter.type === 'cmc') {
                  const cmc = card.cmc || 0;
                  if (statsFilter.value === '7+') return cmc >= 7;
                  return cmc === statsFilter.value;
              }
              if (statsFilter.type === 'cardType') {
                  const typeLine = card.type_line || card.card_faces?.[0]?.type_line || '';
                  return typeLine.includes(String(statsFilter.value));
              }
              return true;
          });
      }
      return list.sort((a,b) => (a.card.cmc || 0) - (b.card.cmc || 0));
  }, [deckCardList, statsFilter]);

  const filteredSearch = useMemo(() => {
      if (searchTerm.length <= 1) return [];
      
      const lowerSearch = searchTerm.toLowerCase();
      return cards.filter(c => {
        const setCode = c.set ? c.set.toLowerCase() : '';
        const typeLine = c.type_line || c.card_faces?.[0]?.type_line || '';
        
        return !NON_PLAYABLE_SETS.includes(setCode) && // Exclude non-playable sets
        !typeLine.includes('Token') && // Exclude actual tokens
        c.name.toLowerCase().includes(lowerSearch);
      }).slice(0, 20);
  }, [cards, searchTerm]);

  // Export Text for Manabox
  const deckExportText = useMemo(() => {
      // Sort primarily by name for easier reading in text format
      const sortedList = [...deckCardList].sort((a, b) => a.card.name.localeCompare(b.card.name));
      
      // Move Commander to top if exists
      const cmdId = activeDeck?.commanderId;
      if (cmdId) {
          const cmdIndex = sortedList.findIndex(item => item.card.id === cmdId);
          if (cmdIndex > -1) {
              const [cmdItem] = sortedList.splice(cmdIndex, 1);
              sortedList.unshift(cmdItem);
          }
      }

      return sortedList.map(({ card, qty }) => {
          return `${qty} ${card.name} (${card.set.toUpperCase()}) ${card.collector_number}`;
      }).join('\n');
  }, [deckCardList, activeDeck?.commanderId]);

  // Stats Calculations
  const totalCards = deckCardList.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = deckCardList.reduce((acc, item) => acc + (item.qty * parseFloat(item.card.prices?.usd || '0')), 0);
  const commander = activeDeck?.commanderId ? cards.find(c => c.id === activeDeck.commanderId) : null;

  const cmcData = useMemo(() => {
      const data = Array(8).fill(0).map((_, i) => ({ name: i === 7 ? '7+' : i, count: 0 }));
      deckCardList.forEach(({ card, qty }) => {
          if (card.cmc !== undefined) {
              const idx = Math.min(card.cmc, 7);
              data[idx].count += qty;
          }
      });
      return data;
  }, [deckCardList]);

  const { pieData, COLORS } = useMemo(() => {
      const typeData: Record<string, number> = {};
      deckCardList.forEach(({ card, qty }) => {
          const typeLine = card.type_line || card.card_faces?.[0]?.type_line || '';
          const type = typeLine.split('—')[0].trim().split(' ').pop() || 'Other';
          typeData[type] = (typeData[type] || 0) + qty;
      });
      const pData = Object.entries(typeData).map(([name, value]) => ({ name, value }));
      const cols = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
      return { pieData: pData, COLORS: cols };
  }, [deckCardList]);

  // --- Handlers ---

  const toggleDeckListColor = (color: string) => {
      setDeckListColors(prev => 
          prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
      );
  };

  const updateDeckCard = (cardId: string, delta: number) => {
      setActiveDeck(prev => {
          if (!prev) return null;
          const newCards = { ...prev.cards };
          const newQty = (newCards[cardId] || 0) + delta;
          if (newQty <= 0) delete newCards[cardId];
          else newCards[cardId] = newQty;
          return { ...prev, cards: newCards };
      });
  };

  const setCommander = (cardId: string | undefined) => {
      setActiveDeck(prev => prev ? { ...prev, commanderId: cardId } : null);
  }

  const setCoverImage = (cardId: string) => {
      setActiveDeck(prev => prev ? { ...prev, coverCardId: cardId } : null);
  }
  
  const handleSetCommanderModal = () => {
    if (!selectedCard || !activeDeck) return;
    setCommander(activeDeck.commanderId === selectedCard.id ? undefined : selectedCard.id);
  };

  const handleSetCoverModal = () => {
      if (!selectedCard || !activeDeck) return;
      setCoverImage(selectedCard.id);
  }

  const handleCopyDeckList = () => {
      navigator.clipboard.writeText(deckExportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessImport = () => {
      const lines = importText.split('\n');
      const newDeckCards: Record<string, number> = {};
      
      lines.forEach(line => {
          const cleanLine = line.trim();
          if (!cleanLine) return;

          // Parse various formats:
          // 1. "1 Sol Ring (TLA) 200"
          // 2. "1x Sol Ring"
          // 3. "Sol Ring" (implies 1)
          
          let qty = 1;
          let name = cleanLine;

          const matchQty = cleanLine.match(/^(\d+)[xX]?\s+(.+)/);
          if (matchQty) {
              qty = parseInt(matchQty[1]);
              name = matchQty[2].trim();
          }

          // Clean up name (remove set codes if present for fuzzy match)
          // E.g. "Sol Ring (TLA) 234" -> "Sol Ring"
          const matchName = name.match(/^(.+?)(?:\s*\(|$)/);
          if (matchName) {
              name = matchName[1].trim();
          }
          
          // Find card
          const foundCard = cards.find(c => c.name.toLowerCase() === name.toLowerCase());
          // Fallback fuzzy search
          const fuzzyCard = foundCard || cards.find(c => c.name.toLowerCase().includes(name.toLowerCase()));

          if (fuzzyCard) {
              newDeckCards[fuzzyCard.id] = (newDeckCards[fuzzyCard.id] || 0) + qty;
          }
      });

      const importedDeck: CustomDeck = {
        id: generateId(),
        name: 'Imported Deck',
        description: 'Imported from text list.',
        cards: newDeckCards,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setActiveDeck(importedDeck);
      setIsImportMode(false);
      setImportText('');
  };

  // --- RENDER ---

  // Deck List View
  if (!activeDeck && !isImportMode) {
      return (
          <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                      <i className="fa-solid fa-compass-drafting text-primary"></i> 
                      Deck Builder
                  </h2>
                  <div className="flex gap-3">
                    <button 
                        onClick={() => setIsImportMode(true)}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 font-medium"
                    >
                        <i className="fa-solid fa-file-import"></i> Import List
                    </button>
                    <button 
                        onClick={() => setActiveDeck({
                            id: generateId(),
                            name: 'New Deck',
                            cards: {},
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        })}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 font-medium"
                    >
                        <i className="fa-solid fa-plus"></i> Manual Deck
                    </button>
                  </div>
              </div>

              {/* Deck Filters */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                      {/* Search */}
                      <div className="flex-1 relative">
                          <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400"></i>
                          <input 
                              type="text" 
                              placeholder="Search decks..." 
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                              value={deckListSearch}
                              onChange={(e) => setDeckListSearch(e.target.value)}
                          />
                      </div>
                      
                      {/* Type Filter */}
                      <select 
                          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={deckListType}
                          onChange={(e) => setDeckListType(e.target.value as any)}
                      >
                          <option value="all">All Types</option>
                          <option value="commander">Commander</option>
                          <option value="standard">60-Card / Standard</option>
                      </select>

                      {/* Format Filter */}
                      <select 
                          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={deckListFormat}
                          onChange={(e) => setDeckListFormat(e.target.value)}
                      >
                          <option value="">All Formats</option>
                          {FORMATS.map(f => <option key={f.id} value={f.id}>Legal in {f.label}</option>)}
                      </select>
                  </div>

                  {/* Color Filter */}
                  <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase mr-2 tracking-wide">Color Identity:</span>
                      {['W', 'U', 'B', 'R', 'G', 'C'].map(c => (
                          <button 
                              key={c}
                              onClick={() => toggleDeckListColor(c)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                                  deckListColors.includes(c) 
                                  ? 'bg-white border-primary ring-1 ring-primary shadow-sm scale-110' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50 opacity-60 hover:opacity-100'
                              }`}
                              title={c === 'C' ? 'Colorless' : `Add ${c}`}
                          >
                              <img src={MANA_SYMBOLS[c]} alt={c} className="w-4 h-4" />
                          </button>
                      ))}
                      {deckListColors.length > 0 && (
                          <button onClick={() => setDeckListColors([])} className="text-xs text-red-500 hover:underline ml-2">
                              Clear
                          </button>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredCustomDecks.map(deck => {
                      const cardCount = (Object.values(deck.cards) as number[]).reduce((a, b) => a + b, 0);
                      const colors = new Set<string>();
                      Object.keys(deck.cards).forEach(id => {
                          const card = cards.find(c => c.id === id);
                          card?.colors?.forEach(c => colors.add(c));
                      });

                      const deckCommander = deck.commanderId ? cards.find(c => c.id === deck.commanderId) : null;
                      
                      // Resolve Cover Image: Explicit > Commander > First Card > Placeholder
                      let coverImg = 'https://via.placeholder.com/250x200?text=No+Art';
                      if (deck.coverCardId) {
                          const coverCard = cards.find(c => c.id === deck.coverCardId);
                          if (coverCard) coverImg = coverCard.image_uris?.art_crop || coverCard.card_faces?.[0]?.image_uris?.art_crop || coverImg;
                      } else if (deckCommander) {
                          coverImg = deckCommander.image_uris?.art_crop || deckCommander.card_faces?.[0]?.image_uris?.art_crop || coverImg;
                      } else {
                          const firstCardId = Object.keys(deck.cards)[0];
                          if (firstCardId) {
                              const firstCard = cards.find(c => c.id === firstCardId);
                              if (firstCard) coverImg = firstCard.image_uris?.art_crop || firstCard.card_faces?.[0]?.image_uris?.art_crop || coverImg;
                          }
                      }

                      return (
                          <div key={deck.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-all cursor-pointer group flex flex-col overflow-hidden relative" onClick={() => setActiveDeck(deck)}>
                              <div className="h-56 w-full bg-gray-100 relative overflow-hidden">
                                  <img src={coverImg} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Deck Cover" />
                                  
                                  {/* Delete Button - Increased z-index and clickability */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm(`Are you sure you want to delete "${deck.name}"?`)) deleteCustomDeck(deck.id); }}
                                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-md border border-red-200"
                                        title="Delete Deck"
                                    >
                                        <i className="fa-solid fa-trash text-sm"></i>
                                    </button>
                                  </div>

                                  {deckCommander && (
                                     <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                         <i className="fa-solid fa-crown text-yellow-400 text-[10px]"></i> {deckCommander.name}
                                     </div>
                                  )}
                              </div>
                              
                              <div className="p-6 flex flex-col flex-1">
                                  <h3 className="font-bold text-xl text-gray-800 mb-2">{deck.name}</h3>
                                  
                                  {deck.description && (
                                      <p className="text-sm text-gray-500 mb-6 flex-1 leading-relaxed line-clamp-3">{deck.description}</p>
                                  )}

                                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{cardCount} Cards</span>
                                         <div className="text-[10px] text-gray-400 mt-1">
                                            Modified: {new Date(deck.updatedAt).toLocaleDateString()}
                                         </div>
                                      </div>
                                      
                                      {/* Colors */}
                                      <div className="flex gap-1">
                                          {Array.from(colors).sort().map(c => (
                                              <img key={c} src={MANA_SYMBOLS[c]} alt={c} className="w-4 h-4 shadow-sm rounded-full" title={c} />
                                          ))}
                                          {colors.size === 0 && <span className="text-xs text-gray-400 font-mono">C</span>}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
                  
                  {filteredCustomDecks.length === 0 && (
                      <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                          <i className="fa-solid fa-layer-group text-4xl mb-4 text-gray-300"></i>
                          <p>No custom decks found.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Import Modal
  if (isImportMode && !activeDeck) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-file-import mr-2 text-primary"></i> Import Deck</h2>
                      <button onClick={() => setIsImportMode(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                      <p className="text-sm text-gray-600 mb-4">Paste your deck list below. Supported format: <code>Qty Name (Set) #</code> or just <code>Qty Name</code>.</p>
                      <textarea 
                          className="w-full h-64 p-4 rounded-xl border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none bg-gray-50"
                          placeholder={`1 Sol Ring\n1 Command Tower\n1 Arcane Signet`}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                      />
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      <button onClick={() => setIsImportMode(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
                      <button 
                          onClick={handleProcessImport}
                          disabled={!importText.trim()}
                          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Process Import
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // Active Editor View (Default Return)
  return (
      <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-gray-50 overflow-hidden animate-in fade-in">
          {/* Left Panel: Search */}
          <div className="w-full md:w-1/4 bg-white border-r border-gray-200 flex flex-col z-20">
              <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                      <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400"></i>
                      <input 
                          type="text" 
                          placeholder="Search cards..." 
                          className="w-full pl-9 pr-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {filteredSearch.map(card => {
                      const face = card.card_faces?.[0] || card;
                      const typeLine = card.type_line || face.type_line || '';
                      
                      return (
                          <div 
                              key={card.id} 
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group cursor-pointer border border-transparent hover:border-gray-200" 
                              onClick={() => setSelectedCard(card)}
                              onMouseEnter={() => onMouseEnter(card)}
                              onMouseLeave={onMouseLeave}
                          >
                              <div className="w-10 h-14 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                  <img src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                  <div className="text-sm font-bold truncate text-gray-800">{card.name}</div>
                                  <div className="flex items-center justify-between">
                                     <div className="text-[10px] text-gray-500 truncate max-w-[80px]">{typeLine.split('—')[0].trim()}</div>
                                     <div className="scale-75 origin-right"><ManaCost manaCost={face.mana_cost} /></div>
                                  </div>
                                  {face.power && face.toughness && (
                                     <div className="text-[10px] font-bold text-gray-600 bg-gray-100 w-fit px-1 rounded border border-gray-200">
                                         {face.power}/{face.toughness}
                                     </div>
                                  )}
                              </div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); updateDeckCard(card.id, 1); }}
                                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                              >
                                  <i className="fa-solid fa-plus"></i>
                              </button>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Middle Panel: Deck List */}
          <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 space-y-3">
                  <div className="flex justify-between items-center gap-4">
                      <input 
                          type="text" 
                          value={activeDeck!.name}
                          onChange={e => setActiveDeck({ ...activeDeck!, name: e.target.value })}
                          className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:border-opacity-50 hover:border-opacity-50 transition-all focus:outline-none w-full mr-4"
                          placeholder="Deck Name"
                      />
                      <div className="flex gap-2">
                          <button onClick={() => { saveCustomDeck(activeDeck!); setActiveDeck(null); }} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium whitespace-nowrap shadow-sm"><i className="fa-solid fa-save mr-2"></i> Save & Close</button>
                          <button onClick={() => setActiveDeck(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg whitespace-nowrap transition-colors">Cancel</button>
                      </div>
                  </div>
                  <textarea 
                      value={activeDeck?.description || ''}
                      onChange={e => setActiveDeck({ ...activeDeck!, description: e.target.value })}
                      className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-primary/30 rounded p-2 focus:outline-none resize-none transition-all placeholder-gray-400"
                      placeholder="Add a description for your deck..."
                      rows={2}
                  />
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  {deckCardList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <i className="fa-solid fa-cards-blank text-6xl mb-4 opacity-50"></i>
                          <p className="text-xl">Your deck is empty</p>
                      </div>
                  ) : (
                      <>
                      
                      {statsFilter && (
                          <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg">
                              <span className="text-sm font-bold">
                                  Filtering by {statsFilter.type === 'cmc' ? 'Mana Cost' : 'Type'}: {statsFilter.value}
                              </span>
                              <button onClick={() => setStatsFilter(null)} className="text-xs underline hover:text-yellow-900">Clear Filter</button>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredDeckList.map(({ card, qty }) => {
                              const face = card.card_faces?.[0] || card;
                              const img = card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop || 'https://via.placeholder.com/250x200?text=No+Art';
                              const isCommander = activeDeck?.commanderId === card.id;
                              const isCover = activeDeck?.coverCardId === card.id;
                              const typeLine = card.type_line || face.type_line || '';

                              return (
                                  <div 
                                      key={card.id} 
                                      className={`bg-white border rounded-lg p-3 flex items-center gap-3 group hover:shadow-md transition-all relative ${isCommander ? 'border-purple-400 ring-1 ring-purple-400' : 'border-gray-200 hover:border-primary/50'}`}
                                      onMouseEnter={() => onMouseEnter(card)}
                                      onMouseLeave={onMouseLeave}
                                  >
                                      <div className="relative w-14 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0 cursor-pointer shadow-sm" onClick={() => setSelectedCard(card)}>
                                          <img src={img} alt="" className="w-full h-full object-cover scale-150" />
                                          {isCommander && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[8px] p-1 rounded-bl" title="Commander"><i className="fa-solid fa-crown"></i></div>}
                                          {isCover && !isCommander && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] p-1 rounded-bl" title="Deck Cover Image"><i className="fa-solid fa-image"></i></div>}
                                      </div>
                                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 pr-6">
                                          <div className="font-bold text-sm truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedCard(card)}>{card.name}</div>
                                          <div className="text-[10px] text-gray-500 font-medium truncate" title={typeLine}>{typeLine}</div>
                                          
                                          <div className="flex items-center gap-2">
                                              {face.power && face.toughness && (
                                                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                                                      {face.power}/{face.toughness}
                                                  </span>
                                              )}
                                              <div className="scale-75 origin-left">
                                                  <ManaCost manaCost={face.mana_cost} />
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                          <button onClick={() => updateDeckCard(card.id, 1)} className="text-gray-300 hover:text-green-500"><i className="fa-solid fa-chevron-up"></i></button>
                                          <span className="font-bold text-lg leading-none text-gray-800">{qty}</span>
                                          <button onClick={() => updateDeckCard(card.id, -1)} className="text-gray-300 hover:text-red-500"><i className="fa-solid fa-chevron-down"></i></button>
                                      </div>
                                      
                                      {/* Context Menu for Commander/Cover - Always visible as small icons or on hover */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); setCommander(isCommander ? undefined : card.id); }}
                                              className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm text-[10px] border transition-colors ${isCommander ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-white text-gray-300 border-gray-200 hover:text-purple-500 hover:border-purple-300'}`}
                                              title={isCommander ? "Unset Commander" : "Set as Commander"}
                                          >
                                              <i className="fa-solid fa-crown"></i>
                                          </button>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); setCoverImage(card.id); }}
                                              className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm text-[10px] border transition-colors ${isCover ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white text-gray-300 border-gray-200 hover:text-blue-500 hover:border-blue-300'}`}
                                              title="Set as Deck Image"
                                          >
                                              <i className="fa-solid fa-image"></i>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                      </>
                  )}
              </div>
          </div>

          {/* Right Panel: Stats */}
          <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
              <div className="p-6 space-y-8 flex-1">
                  {/* Commander Highlight in Stats Area */}
                  {commander && (
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center relative overflow-hidden group cursor-pointer" onClick={() => setSelectedCard(commander)}>
                          <div className="absolute inset-0 bg-purple-200/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2 block">Commander</span>
                          <div className="w-20 h-20 mx-auto rounded-full border-4 border-white shadow-md overflow-hidden mb-3 relative z-10">
                              <img src={commander.image_uris?.art_crop || commander.card_faces?.[0]?.image_uris?.art_crop} alt={commander.name} className="w-full h-full object-cover" />
                          </div>
                          <h3 className="font-bold text-gray-800 text-sm leading-tight px-2">{commander.name}</h3>
                          <div className="text-[10px] text-gray-500 mt-1 truncate">{commander.type_line || commander.card_faces?.[0]?.type_line}</div>
                      </div>
                  )}

                  {/* Legality Check */}
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Legal In</h3>
                      <div className="flex flex-wrap gap-2">
                        {FORMATS.map(fmt => {
                            const isLegal = deckLegality[fmt.id];
                            return (
                                <span 
                                    key={fmt.id} 
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
                                        isLegal 
                                        ? 'bg-green-100 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-400 border-red-100 opacity-60 grayscale-[50%]'
                                    }`}
                                >
                                    {fmt.label}
                                </span>
                            );
                        })}
                      </div>
                  </div>

                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Deck Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                              <span className="block text-2xl font-bold text-gray-800">{totalCards}</span>
                              <span className="text-xs text-gray-500 font-medium">Cards</span>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                              <span className="block text-2xl font-bold text-green-600">${totalPrice.toFixed(2)}</span>
                              <span className="text-xs text-gray-500 font-medium">Est. Value</span>
                          </div>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mana Curve <span className="font-normal text-[10px] ml-1">(Click to filter)</span></h3>
                      <div className="h-40 min-h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cmcData} onClick={(data) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    const val = data.activePayload[0].payload.name;
                                    setStatsFilter({ type: 'cmc', value: val });
                                }
                            }}>
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#9ca3af" />
                                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} cursor="pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="mb-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type Distribution <span className="font-normal text-[10px] ml-1">(Click to filter)</span></h3>
                      <div className="h-40 min-h-[160px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={30}
                                      outerRadius={50}
                                      paddingAngle={5}
                                      dataKey="value"
                                      onClick={(data) => {
                                          setStatsFilter({ type: 'cardType', value: data.name });
                                      }}
                                      cursor="pointer"
                                  >
                                      {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                          {pieData.map((entry, index) => (
                              <div 
                                  key={entry.name} 
                                  className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-bold bg-gray-100 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                                  onClick={() => setStatsFilter({ type: 'cardType', value: entry.name })}
                              >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                  {entry.name}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Manabox Export Section - Pushed to bottom via mt-auto in container if needed, but here explicit separation */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Export List (Manabox)</h3>
                      <button 
                        onClick={handleCopyDeckList}
                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                          {copied ? <><i className="fa-solid fa-check mr-1"></i> Copied</> : <><i className="fa-regular fa-copy mr-1"></i> Copy</>}
                      </button>
                  </div>
                  <textarea 
                      readOnly
                      value={deckExportText}
                      className="w-full h-24 p-2 text-[10px] font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none text-gray-600"
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
              </div>
          </div>

          {selectedCard && (
            <CardModal 
                card={selectedCard} 
                onClose={() => setSelectedCard(null)} 
                onSetCommander={handleSetCommanderModal}
                onSetCover={handleSetCoverModal}
                isCommander={activeDeck.commanderId === selectedCard.id}
                isCover={activeDeck.coverCardId === selectedCard.id}
            />
          )}
      </div>
  );
};
